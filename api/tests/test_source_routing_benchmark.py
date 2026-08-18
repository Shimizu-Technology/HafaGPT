from scripts.run_source_routing_benchmark import load_benchmark, run_benchmark


def test_source_routing_benchmark_is_complete_and_green() -> None:
    document = load_benchmark()
    results = run_benchmark()

    assert len(results) == len(document["cases"])
    assert len(results) >= 20
    assert all(result["passed"] for result in results)
    routes = {case["expected_route"] for case in document["cases"]}
    query_types = {case["expected_query_type"] for case in document["cases"]}
    assert routes == {"knowledge_card_full", "vector_full", "vector_light", "no_rag"}
    assert {"lookup", "educational", "cultural", "historical"} <= query_types
