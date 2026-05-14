from fastapi import APIRouter

router = APIRouter()


@router.post("/preview")
def preview():
    return {"message": "not implemented yet"}
