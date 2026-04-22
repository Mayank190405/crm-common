import os
import shutil
from typing import Protocol
from fastapi import UploadFile
from app.core.config import settings

class StorageService(Protocol):
    async def upload(self, file: UploadFile, folder: str) -> str:
        ...
    
    def get_url(self, file_path: str) -> str:
        ...

class LocalStorageService:
    def __init__(self, base_path: str = "storage"):
        self.base_path = base_path
        if not os.path.exists(base_path):
            os.makedirs(base_path)

    async def upload(self, file: UploadFile, folder: str) -> str:
        target_dir = os.path.join(self.base_path, folder)
        if not os.path.exists(target_dir):
            os.makedirs(target_dir)
        
        file_path = os.path.join(target_dir, file.filename)
        # Handle versioning/duplicates simple logic
        if os.path.exists(file_path):
            name, ext = os.path.splitext(file.filename)
            file_path = os.path.join(target_dir, f"{name}_{int(os.path.getmtime(file_path))}{ext}")

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        return file_path

    def get_url(self, file_path: str) -> str:
        # In local storage, URL is the download endpoint
        return f"/api/v1/downloads/file?path={file_path}"

class S3StorageService:
    def __init__(self):
        # Initialize boto3 here
        pass

    async def upload(self, file: UploadFile, folder: str) -> str:
        # Implementation for S3 upload
        return f"s3://bucket/{folder}/{file.filename}"

    def get_url(self, file_path: str) -> str:
        # Return signed S3 URL
        return "https://bucket.s3.amazonaws.com/..."

# Factory or Dependency
def get_storage() -> StorageService:
    if settings.USE_S3:
        return S3StorageService()
    return LocalStorageService()

storage = get_storage()
