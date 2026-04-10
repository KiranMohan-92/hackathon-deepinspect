import pytest

from utils.rating_conversion import (
    convert_all,
    convert_france,
    convert_germany,
    convert_italy,
    convert_netherlands,
    convert_norway,
    convert_poland,
    convert_sweden,
    convert_uk,
    convert_us,
)


def test_convert_all_returns_nine_country_keys():
    ratings = convert_all(3.0, max_criterion_score=3.5, has_safety_finding=True)

    assert set(ratings) == {
        "germany",
        "france",
        "uk",
        "netherlands",
        "italy",
        "poland",
        "norway",
        "sweden",
        "us",
    }


def test_convert_germany_minimum_score():
    assert convert_germany(1.0)["value"] == pytest.approx(1.0)


def test_convert_germany_maximum_score():
    assert convert_germany(5.0)["value"] == pytest.approx(4.0)


def test_convert_germany_midpoint_score():
    assert convert_germany(3.5)["value"] == pytest.approx(3.0)


def test_convert_france_lowest_rating():
    assert convert_france(1.5)["value"] == "1"


def test_convert_france_two_e_rating():
    assert convert_france(2.5)["value"] == "2E"


def test_convert_france_safety_suffix():
    assert convert_france(4.5, has_safety_finding=True)["value"] == "3US"


def test_convert_uk_minimum_score_is_best_bci():
    assert convert_uk(1.0)["bci_ave"] == 100


def test_convert_uk_maximum_score_is_worst_bci():
    assert convert_uk(5.0)["bci_ave"] == 0


def test_convert_netherlands_minimum_score():
    assert convert_netherlands(1.0)["value"] == 1


def test_convert_netherlands_maximum_score():
    assert convert_netherlands(5.0)["value"] == 6


def test_convert_italy_low_score():
    assert convert_italy(1.0)["value"] == "LOW"


def test_convert_italy_high_score():
    assert convert_italy(4.5)["value"] == "HIGH"


def test_convert_poland_minimum_score():
    assert convert_poland(1.0)["value"] == 0


def test_convert_poland_maximum_score():
    assert convert_poland(5.0)["value"] == 5


def test_convert_norway_mid_high_score():
    assert convert_norway(3.5)["value"] == 3


def test_convert_sweden_mid_high_score():
    assert convert_sweden(3.5)["value"] == 3


def test_convert_us_minimum_score():
    assert convert_us(1.0)["value"] == 9


def test_convert_us_maximum_score():
    assert convert_us(5.0)["value"] == 0


def test_convert_us_structurally_deficient_threshold():
    assert convert_us(3.0)["structurally_deficient"] is True
