import wmill

def main(slug: str, created_by: str = "anonymous", version: int = None, initial_data: dict = None):
    result = wmill.run_script_async(
        path="f/formularios/form_lifecycle/init_flow",
        args={
            "slug": slug,
            "version": version,
            "created_by": created_by,
            "initial_data": initial_data or {}
        }
    )
    
    job_id = result
    
    job_result = wmill.get_result(job_id)
    
    return job_result
