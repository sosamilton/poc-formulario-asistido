import wmill

def main(slug: str, data: dict, version: int = None):
    result = wmill.run_script_async(
        path="f/formularios/form_lifecycle/validate_flow",
        args={
            "slug": slug,
            "version": version,
            "data": data
        }
    )
    
    job_id = result
    
    job_result = wmill.get_result(job_id)
    
    return job_result
