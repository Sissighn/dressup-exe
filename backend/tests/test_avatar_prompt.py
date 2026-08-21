"""Prompt-Tests fuer die Avatar-Generierung.

Bildgenerierung kostet pro Aufruf, deshalb wird hier textuell abgesichert, dass
jeder Koerpertyp eine eigene, konkrete Beschreibung erhaelt und der gewuenschte
Gesichtsausdruck im Prompt landet.
"""

import services

FORM_BODY_TYPES = ["ATHLETIC", "SLIM", "CURVY", "RECTANGULAR"]


def build(body_type, gender="FEMALE"):
    return services.build_avatar_prompt("170", "62", body_type, gender, 1)


def test_every_form_body_type_is_recognized():
    for body_type in FORM_BODY_TYPES:
        assert services.normalize_body_type(body_type) == body_type.lower()


def test_body_types_produce_distinct_prompts():
    prompts = {body_type: build(body_type) for body_type in FORM_BODY_TYPES}
    assert len(set(prompts.values())) == len(FORM_BODY_TYPES)


def test_body_type_prompt_describes_proportions_not_just_a_label():
    curvy = build("CURVY")
    assert "hourglass" in curvy
    assert "narrow and sharply indented waist" in curvy
    # Der Standard-Modelkoerper muss aktiv ausgeschlossen werden.
    assert "Do not default to a generic straight fashion-model physique" in curvy

    athletic = build("ATHLETIC", "MALE")
    assert "wider than the hips" in athletic
    assert "V-taper" in athletic

    rectangular = build("RECTANGULAR")
    assert "almost identical width" in rectangular

    slim = build("SLIM")
    assert "slender arms and legs" in slim


def test_body_shape_outranks_height_and_weight():
    assert "prioritize the body shape" in build("CURVY")


def test_gender_specific_details_are_applied():
    assert "a full rounded bust" in build("CURVY", "FEMALE")
    assert "a solid, rounded chest" in build("CURVY", "MALE")


def test_female_athletic_stays_feminine():
    """Athletic darf bei Frauen keine maennliche Morphologie erzeugen."""
    female = build("ATHLETIC", "FEMALE")

    # Keine maennlichen Schulterproportionen.
    assert "squared-off shoulders that are clearly wider than the hips" not in female
    assert "distinct V-taper from shoulders" not in female

    # Stattdessen ausgewogene Schultern und explizite Abgrenzung.
    assert "never broader or squared-off" in female
    assert "not of a male athlete" in female
    assert "no V-taper physique" in female
    assert "The overall silhouette must read as unmistakably female." in female

    # Der maennliche Avatar behaelt seine Beschreibung.
    male = build("ATHLETIC", "MALE")
    assert "distinct V-taper from shoulders" in male
    assert "unmistakably female" not in male


def test_athletic_female_and_male_differ():
    assert build("ATHLETIC", "FEMALE") != build("ATHLETIC", "MALE")


def test_female_body_types_all_carry_the_feminine_guard():
    for body_type in FORM_BODY_TYPES:
        assert "unmistakably female" in build(body_type, "FEMALE")


def test_unknown_body_type_is_passed_through_instead_of_dropped():
    prompt = build("PEAR")
    assert "a pear body type" in prompt


def test_prompt_requests_a_confident_subtle_smile():
    prompt = build("SLIM")
    assert "subtle closed-lip smile" in prompt
    assert "confident gaze" in prompt
    # Ausdruck darf sich vom Referenzfoto unterscheiden, Identitaet nicht.
    assert "The expression may differ from the reference photo" in prompt
    assert "Maintain the exact facial identity" in prompt
