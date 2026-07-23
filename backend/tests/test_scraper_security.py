from property_tracker.scraper import is_security_challenge


def test_detects_daft_security_check_text() -> None:
    assert is_security_challenge("We are checking the security of your connection...")
    assert is_security_challenge("Just a moment")


def test_does_not_treat_normal_result_text_as_a_challenge() -> None:
    assert not is_security_challenge("SOLD 07/07/2026 Sold: €304,000 Asking: €275,000")
