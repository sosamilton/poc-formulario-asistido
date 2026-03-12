import wmill

def main(
    slug: str,
    data: dict,
    submission_id: str = None,
    version: int = None,
    metadata: dict = None
):
    result = wmill.run_script_async(
        path="f/formularios/form_lifecycle/submit_flow",
        args={
            "slug": slug,
            "version": version,
            "data": data,
            "submission_id": submission_id,
            "metadata": metadata or {}
        }
    )
    
    job_id = result
    
    job_result = wmill.get_result(job_id)
    
    return job_result
