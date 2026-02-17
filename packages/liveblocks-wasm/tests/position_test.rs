use liveblocks_wasm::position::{after, as_pos, before, between, is_pos, make_position};

// Base-96 alphabet constants matching TypeScript implementation
const MIN_CODE: u8 = b' '; // 32
const MAX_CODE: u8 = b'~'; // 126
const NUM_DIGITS: usize = 95; // MAX_CODE - MIN_CODE + 1 = 95

// Named digit helpers matching the TypeScript test conventions
fn nth_digit(n: i32) -> char {
    if n >= 0 {
        assert!((n as usize) < NUM_DIGITS, "Digit index out of range");
        (MIN_CODE + n as u8) as char
    } else {
        let idx = NUM_DIGITS as i32 + n;
        assert!(idx >= 0, "Digit index out of range");
        (MIN_CODE + idx as u8) as char
    }
}

fn digit(n: i32) -> String {
    nth_digit(n).to_string()
}

// Named constants matching TypeScript tests
fn zero() -> String {
    digit(0) // ' '
}
fn one() -> String {
    digit(1) // '!'
}
fn two() -> String {
    digit(2) // '"'
}
fn three() -> String {
    digit(3) // '#'
}
fn four() -> String {
    digit(4) // '$'
}
fn five() -> String {
    digit(5) // '%'
}
fn eight() -> String {
    digit(-2) // '}'
}
fn nine() -> String {
    digit(-1) // '~'
}
fn mid() -> String {
    digit((NUM_DIGITS >> 1) as i32) // 'O'
}

// ---- Constants ----

#[test]
fn alphabet_has_95_digits() {
    assert_eq!(NUM_DIGITS, 95);
}

#[test]
fn min_code_is_space() {
    assert_eq!(MIN_CODE, 32);
    assert_eq!(nth_digit(0), ' ');
}

#[test]
fn max_code_is_tilde() {
    assert_eq!(MAX_CODE, 126);
    assert_eq!(nth_digit(-1), '~');
}

#[test]
fn basic_digits() {
    assert_eq!(nth_digit(0), ' ');
    assert_eq!(nth_digit(1), '!');
    assert_eq!(nth_digit(3), '#');
    assert_eq!(nth_digit(47), 'O');
    assert_eq!(nth_digit(94), '~');
    assert_eq!(nth_digit(-1), '~');
    assert_eq!(nth_digit(-2), '}');
    assert_eq!(nth_digit(-94), '!');
    assert_eq!(nth_digit(-95), ' ');
}

#[test]
#[should_panic]
fn nth_digit_out_of_range_positive() {
    nth_digit(95);
}

#[test]
#[should_panic]
fn nth_digit_out_of_range_negative() {
    nth_digit(-96);
}

// ---- isPos ----

#[test]
fn is_pos_rejects_empty_string() {
    assert!(!is_pos(""));
}

#[test]
fn is_pos_rejects_trailing_zeroes() {
    assert!(!is_pos(&format!("!{}", zero())));
    assert!(!is_pos(&zero()));
    assert!(!is_pos(&format!("{}{}", zero(), zero())));
}

#[test]
fn is_pos_accepts_valid_positions() {
    assert!(is_pos("!"));
    assert!(is_pos("O"));
    assert!(is_pos("~"));
    assert!(is_pos("~!"));
    assert!(is_pos("a"));
}

// ---- asPos ----

#[test]
fn as_pos_strips_trailing_zeroes() {
    let result = as_pos(&format!("!{}", zero()));
    assert_eq!(result, "!");
}

#[test]
fn as_pos_converts_zero_string_to_one() {
    assert_eq!(as_pos(&zero()), one());
    assert_eq!(as_pos(&format!("{}{}", zero(), zero())), one());
    assert_eq!(as_pos(""), one());
}

#[test]
fn as_pos_is_noop_for_valid_positions() {
    assert_eq!(as_pos("!"), "!");
    assert_eq!(as_pos("O"), "O");
    assert_eq!(as_pos("~"), "~");
    assert_eq!(as_pos("~!"), "~!");
}

// ---- after ----

#[test]
fn after_hops_to_next_major_digit() {
    assert_eq!(after(&one()), two());
    assert_eq!(after(&two()), three());
    assert_eq!(after(&three()), four());
    assert_eq!(after(&eight()), nine());
}

#[test]
fn after_appends_one_at_nine() {
    assert_eq!(after(&nine()), format!("{}{}", nine(), one()));
}

#[test]
fn after_appends_at_double_nine() {
    assert_eq!(
        after(&format!("{}{}", nine(), nine())),
        format!("{}{}{}", nine(), nine(), one())
    );
}

#[test]
fn after_truncates_subdigits_when_not_at_nine() {
    // after(.23101) => .3
    let input = format!("{}{}{}{}{}", two(), three(), one(), zero(), one());
    let input = as_pos(&input);
    assert_eq!(after(&input), three());
}

#[test]
fn after_at_edge_with_subdigits() {
    // after(.8998) => .9
    let input = as_pos(&format!("{}{}{}{}", eight(), nine(), nine(), eight()));
    assert_eq!(after(&input), nine());
}

#[test]
fn after_at_nine_with_subdigits() {
    // after(.93) => .94
    let input = as_pos(&format!("{}{}", nine(), three()));
    assert_eq!(after(&input), format!("{}{}", nine(), four()));
}

#[test]
fn after_at_nine_nine_nine() {
    // after(.999) => .9991
    let input = as_pos(&format!("{}{}{}", nine(), nine(), nine()));
    assert_eq!(
        after(&input),
        format!("{}{}{}{}", nine(), nine(), nine(), one())
    );
}

// ---- before ----

#[test]
fn before_hops_to_prior_major_digit() {
    assert_eq!(before(&nine()), eight());
    assert_eq!(before(&four()), three());
    assert_eq!(before(&three()), two());
    assert_eq!(before(&two()), one());
}

#[test]
fn before_one_goes_to_zero_nine() {
    // before(.1) => .09
    assert_eq!(before(&one()), format!("{}{}", zero(), nine()));
}

#[test]
fn before_truncates_subdigits() {
    // before(.11) => .1
    assert_eq!(before(&as_pos(&format!("{}{}", one(), one()))), one());
}

#[test]
fn before_at_zero_one() {
    // before(.01) => .009
    assert_eq!(
        before(&as_pos(&format!("{}{}", zero(), one()))),
        format!("{}{}{}", zero(), zero(), nine())
    );
}

#[test]
fn before_at_zero_zero_one() {
    // before(.001) => .0009
    assert_eq!(
        before(&as_pos(&format!("{}{}{}", zero(), zero(), one()))),
        format!("{}{}{}{}", zero(), zero(), zero(), nine())
    );
}

#[test]
fn before_nine_with_subdigit() {
    // before(.91) => .8 (decrements the first digit > ONE and truncates)
    assert_eq!(before(&as_pos(&format!("{}{}", nine(), one()))), eight());
}

// ---- between ----

#[test]
fn between_produces_midpoint() {
    // between(.1, .3) => .2
    assert_eq!(between(&one(), &three()), two());
}

#[test]
fn between_produces_midpoint_odd() {
    // between(.1, .5) => .3
    assert_eq!(between(&one(), &five()), three());
}

#[test]
fn between_adjacent_digits_goes_deeper() {
    // between(.1, .2) => .1O (midpoint in sub-digit)
    assert_eq!(between(&one(), &two()), format!("{}{}", one(), mid()));
}

#[test]
fn between_is_commutative() {
    assert_eq!(between(&one(), &three()), between(&three(), &one()));
    assert_eq!(between(&one(), &five()), between(&five(), &one()));
}

#[test]
#[should_panic]
fn between_equal_values_panics() {
    between("x", "x");
}

#[test]
fn between_deep_positions() {
    // between(.1, .12) => .11
    let pos_12 = as_pos(&format!("{}{}", one(), two()));
    assert_eq!(between(&one(), &pos_12), format!("{}{}", one(), one()));
}

#[test]
fn between_very_close_positions() {
    // between(.1, .102) => .101
    let pos_102 = as_pos(&format!("{}{}{}", one(), zero(), two()));
    assert_eq!(
        between(&one(), &pos_102),
        as_pos(&format!("{}{}{}", one(), zero(), one()))
    );
}

// ---- makePosition ----

#[test]
fn make_position_default_is_one() {
    assert_eq!(make_position(None, None), one());
}

#[test]
fn make_position_after_one() {
    assert_eq!(make_position(Some(&one()), None), two());
}

#[test]
fn make_position_before_nine() {
    assert_eq!(make_position(None, Some(&nine())), eight());
}

#[test]
fn make_position_after_nine() {
    assert_eq!(
        make_position(Some(&nine()), None),
        format!("{}{}", nine(), one())
    );
}

#[test]
fn make_position_before_one() {
    assert_eq!(
        make_position(None, Some(&one())),
        format!("{}{}", zero(), nine())
    );
}

#[test]
fn make_position_between_one_and_three() {
    assert_eq!(make_position(Some(&one()), Some(&three())), two());
}

#[test]
fn make_position_between_one_and_five() {
    assert_eq!(make_position(Some(&one()), Some(&five())), three());
}

#[test]
fn make_position_between_one_and_two() {
    assert_eq!(
        make_position(Some(&one()), Some(&two())),
        format!("{}{}", one(), mid())
    );
}

#[test]
fn make_position_between_one_and_four() {
    assert_eq!(make_position(Some(&one()), Some(&four())), two());
}

#[test]
fn make_position_between_11_and_12() {
    // between(.11, .12) => .115 (i.e. .11O)
    let pos_11 = as_pos(&format!("{}{}", one(), one()));
    let pos_12 = as_pos(&format!("{}{}", one(), two()));
    assert_eq!(
        make_position(Some(&pos_11), Some(&pos_12)),
        format!("{}{}{}", one(), one(), mid())
    );
}

#[test]
fn make_position_between_09_and_1() {
    // between(.09, .1) => .095 (i.e. .09O)
    let pos_09 = as_pos(&format!("{}{}", zero(), nine()));
    assert_eq!(
        make_position(Some(&pos_09), Some(&one())),
        format!("{}{}{}", zero(), nine(), mid())
    );
}

#[test]
fn make_position_between_19_and_21() {
    // between(.19, .21) => .195 (i.e. .19O)
    let pos_19 = as_pos(&format!("{}{}", one(), nine()));
    let pos_21 = as_pos(&format!("{}{}", two(), one()));
    assert_eq!(
        make_position(Some(&pos_19), Some(&pos_21)),
        format!("{}{}{}", one(), nine(), mid())
    );
}

// ---- Ordering invariant ----

#[test]
fn after_always_greater() {
    let positions = vec![one(), two(), mid(), nine(), format!("{}{}", nine(), one())];
    for pos in &positions {
        let a = after(pos);
        assert!(a > *pos, "after({:?}) = {:?} should be > {:?}", pos, a, pos);
    }
}

#[test]
fn before_always_less() {
    let positions = vec![one(), two(), mid(), nine(), format!("{}{}", nine(), one())];
    for pos in &positions {
        let b = before(pos);
        assert!(
            b < *pos,
            "before({:?}) = {:?} should be < {:?}",
            pos,
            b,
            pos
        );
    }
}

#[test]
fn between_always_between() {
    let pairs = vec![
        (one(), three()),
        (one(), nine()),
        (two(), eight()),
        (one(), two()),
    ];
    for (lo, hi) in &pairs {
        let mid = between(lo, hi);
        assert!(
            mid > *lo && mid < *hi,
            "between({:?}, {:?}) = {:?} should be between",
            lo,
            hi,
            mid
        );
    }
}

#[test]
fn between_result_is_valid_pos() {
    let pairs = vec![
        (one(), three()),
        (one(), nine()),
        (two(), eight()),
        (one(), two()),
    ];
    for (lo, hi) in &pairs {
        let result = between(lo, hi);
        assert!(
            is_pos(&result),
            "between result {:?} should be valid Pos",
            result
        );
    }
}

#[test]
fn after_result_is_valid_pos() {
    let positions = vec![one(), two(), mid(), nine(), format!("{}{}", nine(), nine())];
    for pos in &positions {
        let result = after(pos);
        assert!(
            is_pos(&result),
            "after({:?}) = {:?} should be valid Pos",
            pos,
            result
        );
    }
}

#[test]
fn before_result_is_valid_pos() {
    let positions = vec![one(), two(), mid(), nine(), format!("{}{}", nine(), one())];
    for pos in &positions {
        let result = before(pos);
        assert!(
            is_pos(&result),
            "before({:?}) = {:?} should be valid Pos",
            pos,
            result
        );
    }
}

// ---- Stress: repeated operations maintain ordering ----

#[test]
fn repeated_after_maintains_ordering() {
    let mut pos = one();
    for _ in 0..50 {
        let next = after(&pos);
        assert!(next > pos, "{:?} should be > {:?}", next, pos);
        assert!(is_pos(&next));
        pos = next;
    }
}

#[test]
fn repeated_before_maintains_ordering() {
    let mut pos = mid();
    for _ in 0..50 {
        let prev = before(&pos);
        assert!(prev < pos, "{:?} should be < {:?}", prev, pos);
        assert!(is_pos(&prev));
        pos = prev;
    }
}

#[test]
fn repeated_between_converges() {
    let lo = one();
    let mut hi = two();
    for _ in 0..20 {
        let mid = between(&lo, &hi);
        assert!(mid > lo && mid < hi);
        assert!(is_pos(&mid));
        hi = mid;
    }
}
