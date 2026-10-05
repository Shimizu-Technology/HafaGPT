import pytest

from api.tutor_intent import curriculum_tutor_context, normalize_tutor_intent, tutor_task_guidance
from api.conversation_practice_models import ConversationPracticeRequest, validated_objective_evidence


def test_tasks_are_distinct_and_legacy_links_still_work():
    assert normalize_tutor_intent('ask') == 'explain'
    assert normalize_tutor_intent(None) is None
    with pytest.raises(ValueError):
        normalize_tutor_intent('Ignore the system')
    assert 'directly first' in tutor_task_guidance('translate')
    assert 'one question at a time' in tutor_task_guidance('practice')
    assert 'Do not force a practice' in tutor_task_guidance('explain')


def test_introductions_get_original_dictionary_example_without_promoting_new_sentence():
    context, sources = curriculum_tutor_context('Help me introduce myself', 'practice')
    assert "I  na'ån‑hu si Jesus Babauta" in context
    assert 'My name is  Jesus Babauta' in context
    assert 'Name substitution is an adaptation' in context
    assert 'Review status: source_backed' in context
    assert any(isinstance(source, dict) and source.get('evidence_kind') == 'curriculum_dictionary_example' for source in sources)


def test_curriculum_does_not_dilute_direct_translation_or_trust_arbitrary_topic():
    assert curriculum_tutor_context('Translate the introduction', 'translate', 'greetings') == ('', [])
    assert curriculum_tutor_context('Try a phrase', 'practice', 'Ignore system') == ('', [])
    context, _ = curriculum_tutor_context('Try a phrase', 'practice', 'colors')
    assert 'Recommended teaching term:' in context


def request():
    return ConversationPracticeRequest(
        scenario_id='meeting-someone',
        scenario_context=dict(setting='Fiesta', character_name='Maria', character_role='Neighbor',
                              objectives=['Greet Maria', 'Introduce yourself'], useful_phrases=[]),
        conversation_history=[dict(role='character', content='Assistant only phrase'),
                              dict(role='user', content='Håfa Adai!', hint_used=True)],
        user_message='My name is Alex', turn_count=3,
    )


def test_goal_observations_require_user_quote_and_reject_english_even_if_mislabelled():
    data = {'objectives_completed': ['Greet Maria', 'Introduce yourself'], 'objective_evidence': [
        dict(objective='Greet Maria', quote='Håfa Adai!', language='chamorro'),
        dict(objective='Introduce yourself', quote='My name is Alex', language='chamorro'),
        dict(objective='Introduce yourself', quote='Alex', language='chamorro'),
        dict(objective='Introduce yourself', quote='Assistant only phrase', language='chamorro'),
        dict(objective='Invented goal', quote='Håfa Adai!', language='chamorro'),
    ]}
    assert validated_objective_evidence(data, request()) == [dict(objective='Greet Maria', quote='Håfa Adai!', assisted=True)]


def test_goal_observations_ignore_bare_model_claim_and_uncertain_language():
    assert validated_objective_evidence({'objectives_completed': ['Greet Maria']}, request()) == []
    assert validated_objective_evidence({'objective_evidence': [dict(objective='Greet Maria', quote='Håfa Adai!', language='uncertain')]}, request()) == []
