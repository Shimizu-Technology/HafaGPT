from src.rag.school_context import (
    GENERAL_DOCUMENT_ANALYSIS_GUIDANCE,
    SCHOOL_ANNOUNCEMENT_GUIDANCE,
    content_analysis_guidance,
    document_analysis_guidance,
    is_school_announcement_context,
)


def test_explicit_school_chat_wrapper_activates_school_mode() -> None:
    assert is_school_announcement_context(
        "What does this mean? It is from my daughter's class chat for school."
    )


def test_operational_bilingual_school_message_activates_school_mode() -> None:
    assert is_school_announcement_context(
        "Manana si Yu'os familia. TÅYA' KLAS PÅ'GO sa' gof takpapa' i hanom."
    )


def test_named_academy_reminder_activates_school_mode() -> None:
    assert is_school_announcement_context(
        "Hurao Academy reminder: permission slips are due Friday."
    )


def test_hurao_style_family_greeting_plus_operational_notice_activates() -> None:
    assert is_school_announcement_context(
        "Buenas familia. The phone lines are down today. Put fabot email the office."
    )


def test_extracted_school_document_with_action_activates_school_mode() -> None:
    message = (
        "Please analyze this PDF\n\n--- Document Content ---\n"
        "Maga'låhen Hurao Academy Student Parent Handbook\n"
        "Please review and sign by Friday."
    )
    assert is_school_announcement_context(message)


def test_trusted_image_signal_activates_school_mode_without_text_clues() -> None:
    assert is_school_announcement_context(
        "What does this say?",
        image_school_signal=True,
    )


def test_generic_school_vocabulary_and_general_questions_stay_general() -> None:
    general_queries = (
        "What does eskuela mean?",
        "Teach me vocabulary for school.",
        "Tell me about schools in Guam.",
        "My daughter likes school.",
        "Translate the word teacher.",
        "Buenas familia, the power is out at our house.",
        "Write a parent message about learning Chamorro.",
    )
    assert all(not is_school_announcement_context(query) for query in general_queries)


def test_generic_attachment_without_school_evidence_stays_general() -> None:
    assert not is_school_announcement_context(
        "Please analyze this restaurant menu.",
    )


def test_school_worksheets_with_assignment_wording_stay_general() -> None:
    worksheet_texts = (
        "Hurao Academy worksheet: review vocabulary and bring it on Friday.",
        "Hurao Academy worksheet: homework is due Friday.",
        "Hurao Academy worksheet: see the schedule on page two.",
        "Hurao Academy worksheet: complete the permission slip exercise.",
    )

    assert all(
        not is_school_announcement_context(worksheet) for worksheet in worksheet_texts
    )


def test_school_guidance_is_action_first_and_preserves_source_text() -> None:
    guidance = document_analysis_guidance(
        "uploaded image(s)",
        school_announcement=True,
    )

    assert guidance == SCHOOL_ANNOUNCEMENT_GUIDANCE
    assert guidance.index("## What This Means") < guidance.index("## Complete Translation")
    assert guidance.index("## What You Need to Do") < guidance.index("## Original Text")
    assert "mixed Chamorro/English" in guidance
    assert "Do not silently replace" in guidance
    assert "Do not apply this structure" in guidance


def test_general_document_guidance_is_unchanged_for_non_school_uploads() -> None:
    guidance = document_analysis_guidance(
        "uploaded document(s)",
        school_announcement=False,
    )

    assert guidance == GENERAL_DOCUMENT_ANALYSIS_GUIDANCE.format(
        doc_type="uploaded document(s)"
    )
    assert "## Document Overview" in guidance
    assert "## What You Need to Do" not in guidance


def test_content_guidance_routes_school_image_and_generic_image_differently() -> None:
    school_guidance, school_match = content_analysis_guidance(
        "What does this say?",
        has_images=True,
        image_school_signal=True,
    )
    general_guidance, general_match = content_analysis_guidance(
        "What does this say?",
        has_images=True,
        image_school_signal=False,
    )

    assert school_match is True
    assert school_guidance == SCHOOL_ANNOUNCEMENT_GUIDANCE
    assert general_match is False
    assert "## Document Overview" in general_guidance
    assert "## What You Need to Do" not in general_guidance


def test_text_only_school_message_gets_action_first_guidance() -> None:
    guidance, school_match = content_analysis_guidance(
        "School announcement: classes are cancelled today.",
        has_images=False,
    )

    assert school_match is True
    assert guidance == SCHOOL_ANNOUNCEMENT_GUIDANCE


def test_text_only_general_question_gets_no_document_contract() -> None:
    guidance, school_match = content_analysis_guidance(
        "Tell me about Chamorro greetings.",
        has_images=False,
    )

    assert school_match is False
    assert guidance == ""
