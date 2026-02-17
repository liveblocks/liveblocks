//! Fractional indexing for LiveList ordering.
//! Base-96 encoding using printable ASCII characters (codepoints 32-126).
//! Binary-compatible with the TypeScript implementation in position.ts.

const MIN_CODE: u8 = b' '; // 32
const MAX_CODE: u8 = b'~'; // 126
const ZERO: char = ' '; // MIN_CODE as char
const ONE: char = '!'; // MIN_CODE + 1

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
pub fn after(pos: &str) -> String {
    let bytes = pos.as_bytes();

    for (i, &code) in bytes.iter().enumerate() {
        let clamped = code.clamp(MIN_CODE, MAX_CODE);

        if clamped < MAX_CODE {
            // Found a digit that isn't "nine" -- increment it and truncate
            let mut result = take_n(pos, i);
            result.push((clamped + 1) as char);
            return result;
        }
    }

    // All digits are "nines" -- append ONE
    let mut result = String::with_capacity(pos.len() + 1);
    for &b in bytes {
        result.push(b.clamp(MIN_CODE, MAX_CODE) as char);
    }
    result.push(ONE);
    result
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
/// Panics if the positions are equal.
pub fn between(lo: &str, hi: &str) -> String {
    if lo < hi {
        between_ordered(lo, hi)
    } else if lo > hi {
        between_ordered(hi, lo)
    } else {
        panic!("Cannot compute value between two equal positions");
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
