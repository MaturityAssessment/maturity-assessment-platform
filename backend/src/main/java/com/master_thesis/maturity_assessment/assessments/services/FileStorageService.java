package com.master_thesis.maturity_assessment.assessments.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
public class FileStorageService {

    @Value("${app.evidence.upload-dir:uploads/evidence}")
    private String uploadDir;

    @Value("${app.evidence.max-file-size:52428800}")
    private long maxFileSize;

    @Value("${app.evidence.allowed-types:application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/jpg,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain}")
    private String allowedTypesString;

    private Path getUploadPath() {
        Path path = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(path);
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory", e);
        }
        return path;
    }

    public String storeFile(MultipartFile file, Long assessmentId, Long questionId) throws IOException {
        validateFile(file);

        // Generate unique filename
        String originalFilename = file.getOriginalFilename();
        // Sanitize filename
        String sanitizedFilename = sanitizeFilename(originalFilename);
        String extension = "";
        int lastDotIndex = sanitizedFilename.lastIndexOf('.');
        if (lastDotIndex > 0) {
            extension = sanitizedFilename.substring(lastDotIndex);
            sanitizedFilename = sanitizedFilename.substring(0, lastDotIndex);
        }

        // Create unique filename: UUID + sanitized name + extension
        String uniqueFilename = UUID.randomUUID().toString() + "_" + sanitizedFilename + extension;

        // Create directory structure: uploads/evidence/assessmentId/questionId/
        Path assessmentDir = getUploadPath().resolve(String.valueOf(assessmentId));
        Path questionDir = assessmentDir.resolve(String.valueOf(questionId));
        Files.createDirectories(questionDir);

        // Store file
        Path targetLocation = questionDir.resolve(uniqueFilename);
        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

        // Return relative path from upload directory
        return assessmentId + "/" + questionId + "/" + uniqueFilename;
    }

    public void validateFile(MultipartFile file) {
        if (file == null) {
            throw new IllegalArgumentException("File is required");
        }
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        if (!isValidFileType(file.getContentType())) {
            throw new IllegalArgumentException("File type not allowed: " + file.getContentType());
        }

        if (!isValidFileSize(file.getSize())) {
            throw new IllegalArgumentException("File size exceeds maximum allowed size of " + (maxFileSize / 1024 / 1024) + "MB");
        }

        // Generate unique filename
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isEmpty()) {
            throw new IllegalArgumentException("Filename is empty");
        }
    }

    public Resource loadFileAsResource(String filePath) throws IOException {
        Path file = getUploadPath().resolve(filePath).normalize();
        Resource resource = new UrlResource(file.toUri());

        if (resource.exists() && resource.isReadable()) {
            return resource;
        } else {
            throw new IOException("File not found or not readable: " + filePath);
        }
    }

    public void deleteFile(String filePath) throws IOException {
        Path file = getUploadPath().resolve(filePath).normalize();
        Files.deleteIfExists(file);
    }

    public boolean isValidFileType(String contentType) {
        if (contentType == null) {
            return false;
        }
        List<String> allowedTypes = Arrays.asList(allowedTypesString.split(","));
        return allowedTypes.contains(contentType.toLowerCase());
    }

    public boolean isValidFileSize(long size) {
        return size > 0 && size <= maxFileSize;
    }

    private String sanitizeFilename(String filename) {
        // Remove path traversal attempts and dangerous characters
        String sanitized = filename.replaceAll("\\.\\.", "")
                .replaceAll("/", "")
                .replaceAll("\\\\", "")
                .replaceAll("[^a-zA-Z0-9._-]", "_");
        return sanitized.length() > 200 ? sanitized.substring(0, 200) : sanitized;
    }

    public String getContentType(String filePath) {
        try {
            return Files.probeContentType(Paths.get(filePath));
        } catch (IOException e) {
            return "application/octet-stream";
        }
    }
}
