//! Fractional indexing for LiveList ordering.
//! Base-96 encoding using printable ASCII characters (codepoints 32-126).
//! Binary-compatible with the TypeScript implementation in position.ts.

const MIN_CODE: u8 = b' '; // 32
const MAX_CODE: u8 = b'~'; // 126
const NUM_DIGITS: u8 = MAX_CODE - MIN_CODE + 1; // 95
const ZERO: char = ' '; // MIN_CODE as char
const ONE: char = '!'; // MIN_CODE + 1
const VIEWPORT_START: usize = 2;
const VIEWPORT_STEP: usize = 3;

/// Check whether a string is a valid Pos value.
/// Rules: non-empty, no trailing zeroes (trailing ' '), all chars in range.
pub fn is_pos(s: &str) -> bool {
    if s.is_empty() {
        return false;
    }

    let bytes = s.as_bytes();
    let last = bytes[bytes.len() - 1];

    // Last digit may not be a "0" (no trailing zeroes)
    if last <= MIN_CODE || last > MAX_CODE {
        return false;
    }

    // All other chars must be in range
    for &b in &bytes[..bytes.len() - 1] {
        if !(MIN_CODE..=MAX_CODE).contains(&b) {
            return false;
        }
    }

    true
}

/// Convert a string to the nearest valid Pos value.
/// Clamps chars to range, strips trailing zeroes, defaults to ONE if all-zero.
pub fn as_pos(s: &str) -> String {
    if is_pos(s) {
        return s.to_string();
    }
    convert_to_pos(s)
}

fn convert_to_pos(s: &str) -> String {
    let mut codes: Vec<u8> = Vec::with_capacity(s.len());

    for &b in s.as_bytes() {
        codes.push(b.clamp(MIN_CODE, MAX_CODE));
    }

    // Strip trailing zeroes
    while !codes.is_empty() && codes[codes.len() - 1] == MIN_CODE {
        codes.pop();
    }

    if codes.is_empty() {
        ONE.to_string()
    } else {
        String::from_utf8(codes).expect("All bytes are valid ASCII")
    }
}

/// Compute the next position after the given position.
///
/// Uses "viewport-based allocation" (V=2+3) to bound position length growth
/// when repeatedly pushing items. Instead of always incrementing the last digit
/// (which leads to O(n/94) length growth), we treat positions as fixed-width
/// numbers within a "viewport" of V digits.
///
/// Viewport growth: V=2 → V=5 → V=8 → V=11 → ...
pub fn after(pos: &str) -> String {
    let bytes = pos.as_bytes();

    // For positions with any chars outside valid range, just append ONE.
    for &code in bytes {
        if code < MIN_CODE || code > MAX_CODE {
            let mut result = pos.to_string();
            result.push(ONE);
            return result;
        }
    }

    // Strip trailing zeros for canonical form
    let mut canonical = pos.to_string();
    while canonical.len() > 1
        && canonical.as_bytes()[canonical.len() - 1] == MIN_CODE
    {
        canonical.pop();
    }

    // Handle empty/zero input
    if canonical.is_empty()
        || (canonical.len() == 1 && canonical.as_bytes()[0] == MIN_CODE)
    {
        return ONE.to_string();
    }

    // Determine viewport: V=2, then 5, 8, 11, ...
    let mut viewport = VIEWPORT_START;
    if canonical.len() > VIEWPORT_START {
        let extra = canonical.len() - VIEWPORT_START;
        let steps = (extra + VIEWPORT_STEP - 1) / VIEWPORT_STEP; // ceil div
        viewport = VIEWPORT_START + steps * VIEWPORT_STEP;
    }

    // Try to increment within current viewport
    if let Some(result) = increment_within_viewport(&canonical, viewport) {
        return result;
    }

    // Overflow: extend viewport and increment
    viewport += VIEWPORT_STEP;
    if let Some(result) = increment_within_viewport(&canonical, viewport) {
        return result;
    }

    // Fallback (should rarely happen): just append
    canonical.push(ONE);
    canonical
}

/// Increment a position string within a fixed viewport width.
/// Returns `None` if overflow occurs (all digits at max).
fn increment_within_viewport(pos: &str, viewport: usize) -> Option<String> {
    let bytes = pos.as_bytes();

    // Build array of digit values, padded to viewport width
    let mut digits: Vec<u8> = Vec::with_capacity(viewport);
    for i in 0..viewport {
        if i < bytes.len() {
            digits.push(bytes[i] - MIN_CODE);
        } else {
            digits.push(0); // Pad with zeros
        }
    }

    // Increment from right to left with carry
    let mut carry: u8 = 1;
    for i in (0..viewport).rev() {
        if carry == 0 {
            break;
        }
        let sum = digits[i] + carry;
        if sum >= NUM_DIGITS {
            digits[i] = 0;
            carry = 1;
        } else {
            digits[i] = sum;
            carry = 0;
        }
    }

    // If carry remains, we overflowed the viewport
    if carry > 0 {
        return None;
    }

    // Convert back to string
    let mut result: Vec<u8> = digits.iter().map(|&d| d + MIN_CODE).collect();

    // Strip trailing zeros
    while result.len() > 1 && result[result.len() - 1] == MIN_CODE {
        result.pop();
    }

    Some(String::from_utf8(result).expect("All bytes are valid ASCII"))
}

/// Compute the position before the given position.
pub fn before(pos: &str) -> String {
    let pos = as_pos(pos);
    let bytes = pos.as_bytes();

    for (i, &code) in bytes.iter().enumerate() {
        if code > MIN_CODE + 1 {
            // Found a digit > ONE -- decrement it and truncate
            let mut result = take_n(&pos, i);
            result.push((code - 1) as char);
            return result;
        }

        if code == MIN_CODE + 1 {
            // At ONE -- need to go deeper
            // Check if there are non-zero subdigits after this
            let has_subdigits = bytes[i + 1..].iter().any(|&b| b > MIN_CODE);
            if has_subdigits {
                // Truncate subdigits (effectively rounding down)
                let mut result = take_n(&pos, i);
                result.push(ONE);
                return as_pos(&result);
            }
            // Continue to next digit -- will produce e.g. " ~" for before("!")
        }
    }

    // Edge case: at the left edge (.1, .01, .001, etc.)
    // Produce ZERO * len + NINE (e.g., before("!") = " ~")
    let mut result = String::with_capacity(pos.len() + 1);
    for _ in 0..pos.len() {
        result.push(ZERO);
    }
    result.push(MAX_CODE as char);
    result
}

/// Compute a position between two positions.
/// When the two positions are equal (which can occur after concurrent ops),
/// falls back to computing a position after the given position instead of panicking.
pub fn between(lo: &str, hi: &str) -> String {
    if lo < hi {
        between_ordered(lo, hi)
    } else if lo > hi {
        between_ordered(hi, lo)
    } else {
        // Equal positions can arise from concurrent op application.
        // Fall back to after(lo) which always produces a valid successor.
        after(lo)
    }
}

fn between_ordered(lo: &str, hi: &str) -> String {
    let lo_len = lo.len();
    let hi_len = hi.len();
    let mut index = 0;

    loop {
        let lo_code = if index < lo_len {
            lo.as_bytes()[index]
        } else {
            MIN_CODE
        };
        let hi_code = if index < hi_len {
            hi.as_bytes()[index]
        } else {
            MAX_CODE
        };

        if lo_code == hi_code {
            index += 1;
            continue;
        }

        if hi_code - lo_code == 1 {
            // Difference of only 1: settle in next digit
            let size = index + 1;
            let mut prefix = take_n(lo, size);
            let suffix = if size < lo_len { &lo[size..] } else { "" };
            let nines = ""; // Interpreted as .999...
            let between_suffix = between_ordered(suffix, nines);
            prefix.push_str(&between_suffix);
            return prefix;
        }

        // Difference > 1: take midpoint
        let mid_code = (hi_code as u16 + lo_code as u16) >> 1;
        let mut result = take_n(lo, index);
        result.push(mid_code as u8 as char);
        return result;
    }
}

fn take_n(pos: &str, n: usize) -> String {
    if n <= pos.len() {
        pos[..n].to_string()
    } else {
        let mut result = pos.to_string();
        for _ in 0..(n - pos.len()) {
            result.push(ZERO);
        }
        result
    }
}

/// Compute a fractional position string.
/// - No arguments: returns the default first position (ONE = "!")
/// - before only: returns a position before it
/// - after only: returns a position after it
/// - both: returns a position between them
pub fn make_position(before_pos: Option<&str>, after_pos: Option<&str>) -> String {
    match (before_pos, after_pos) {
        (None, None) => ONE.to_string(),
        (Some(b), None) => after(b),
        (None, Some(a)) => self::before(a),
        (Some(b), Some(a)) => between(b, a),
    }
}
