package com.master_thesis.maturity_assessment.maturity_models.controllers;

import com.master_thesis.maturity_assessment.auth.models.User;
import com.master_thesis.maturity_assessment.maturity_models.dto.MaturityModelDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.MaturityModelSummaryDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.CsvUploadResponse;
import com.master_thesis.maturity_assessment.maturity_models.dto.MaturityModelEditorDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.MaturityModelEditorImportResponse;
import com.master_thesis.maturity_assessment.maturity_models.services.MaturityModelExcelService;
import com.master_thesis.maturity_assessment.maturity_models.services.MaturityModelService;
import com.master_thesis.maturity_assessment.config.IllegalOperationException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.ArrayList;
import java.util.Locale;

@RestController
@RequestMapping("/api/v1/maturity-model")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MaturityModelController {

    private final MaturityModelService maturityModelService;
    private final MaturityModelExcelService maturityModelExcelService;

    @GetMapping
    public ResponseEntity<List<MaturityModelSummaryDTO>> getAllMaturityModels(
            @RequestParam(required = false) Long domainId) {
        List<MaturityModelSummaryDTO> models = maturityModelService.getAllMaturityModels(domainId);
        return ResponseEntity.ok(models);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MaturityModelDTO> getMaturityModelById(@PathVariable Long id) {
        MaturityModelDTO model = maturityModelService.getMaturityModelById(id);
        return ResponseEntity.ok(model);
    }

    @GetMapping("/{id}/versions")
    public ResponseEntity<List<MaturityModelSummaryDTO>> getMaturityModelVersions(@PathVariable Long id) {
        List<MaturityModelSummaryDTO> versions = maturityModelService.getMaturityModelVersions(id);
        return ResponseEntity.ok(versions);
    }

    @GetMapping("/{id}/export.xlsx")
    public ResponseEntity<byte[]> exportMaturityModelAsXlsx(@PathVariable Long id) throws java.io.IOException {
        MaturityModelDTO model = maturityModelService.getMaturityModelById(id);
        byte[] bytes = maturityModelExcelService.exportMaturityModelToXlsx(model);
        String fileName = "maturity-model-" + id + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }

    @GetMapping("/active")
    public ResponseEntity<List<MaturityModelDTO>> getActiveMaturityModels(
            @RequestParam(required = false) Long domainId) {
        List<MaturityModelDTO> models = maturityModelService.getActiveMaturityModels(domainId);
        return ResponseEntity.ok(models);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('CURATOR', 'ADMIN')")
    public ResponseEntity<MaturityModelDTO> createMaturityModel(@RequestBody MaturityModelDTO maturityModelDTO) {
        MaturityModelDTO createdModel = maturityModelService.createMaturityModel(
                maturityModelDTO,
                getCurrentUser());
        return ResponseEntity.ok(createdModel);
    }

    @GetMapping("/{id}/editor")
    @PreAuthorize("hasAnyRole('CURATOR', 'ADMIN')")
    public ResponseEntity<MaturityModelEditorDTO> getEditorDocument(@PathVariable Long id) {
        return ResponseEntity.ok(maturityModelService.getMaturityModelEditor(id));
    }

    @PostMapping("/editor")
    @PreAuthorize("hasAnyRole('CURATOR', 'ADMIN')")
    public ResponseEntity<MaturityModelDTO> createFromEditor(@RequestBody MaturityModelEditorDTO editor) {
        return ResponseEntity.ok(maturityModelService.createFromEditor(editor, getCurrentUser()));
    }

    @PostMapping("/{id}/versions/editor")
    @PreAuthorize("hasAnyRole('CURATOR', 'ADMIN')")
    public ResponseEntity<MaturityModelDTO> createVersionFromEditor(
            @PathVariable Long id,
            @RequestBody MaturityModelEditorDTO editor) {
        return ResponseEntity.ok(maturityModelService.createVersionFromEditor(id, editor, getCurrentUser()));
    }

    @PostMapping("/editor/parse-upload")
    @PreAuthorize("hasAnyRole('CURATOR', 'ADMIN')")
    public ResponseEntity<MaturityModelEditorImportResponse> parseEditorUpload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "domainId", required = false) Long domainId) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(new MaturityModelEditorImportResponse(
                    false, "No file provided", null, new ArrayList<>(), "Please select an Excel file."));
        }
        String original = file.getOriginalFilename();
        if (original == null || !original.toLowerCase(Locale.ROOT).endsWith(".xlsx")) {
            return ResponseEntity.badRequest().body(new MaturityModelEditorImportResponse(
                    false, "Invalid file type", null, new ArrayList<>(), "Please upload an Excel file (.xlsx)."));
        }
        try {
            CsvUploadResponse parsed = maturityModelExcelService.parseExcelWorkbook(file.getInputStream());
            if (!parsed.isSuccess() || parsed.getMaturityModel() == null) {
                return ResponseEntity.badRequest().body(new MaturityModelEditorImportResponse(
                        false, parsed.getMessage(), null, new ArrayList<>(), parsed.getErrorDetails()));
            }
            parsed.getMaturityModel().setDomainId(domainId);
            MaturityModelEditorDTO document = maturityModelService.prepareEditorDocument(parsed.getMaturityModel());
            List<String> warnings = new ArrayList<>();
            warnings.add("Review generated item codes and imported content before saving.");
            return ResponseEntity.ok(new MaturityModelEditorImportResponse(
                    true, "Workbook loaded into the editor.", document, warnings, null));
        } catch (IllegalOperationException e) {
            return ResponseEntity.badRequest().body(new MaturityModelEditorImportResponse(
                    false, "Workbook validation failed", null, new ArrayList<>(), e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(new MaturityModelEditorImportResponse(
                    false, "Failed to process file", null, new ArrayList<>(), e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('CURATOR', 'ADMIN')")
    public ResponseEntity<MaturityModelDTO> deleteMaturityModel(@PathVariable Long id) {
        MaturityModelDTO createdModel = maturityModelService.deleteMaturityModel(id);
        return ResponseEntity.ok(createdModel);
    }

    @PutMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('CURATOR', 'ADMIN')")
    public ResponseEntity<MaturityModelDTO> activateMaturityModel(@PathVariable Long id) {
        MaturityModelDTO activatedModel = maturityModelService.activateMaturityModel(id);
        return ResponseEntity.ok(activatedModel);
    }

    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyRole('CURATOR', 'ADMIN')")
    public ResponseEntity<MaturityModelDTO> deactivateMaturityModel(@PathVariable Long id) {
        MaturityModelDTO model = maturityModelService.deactivateMaturityModel(id);
        return ResponseEntity.ok(model);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('CURATOR', 'ADMIN')")
    public ResponseEntity<MaturityModelDTO> updateMaturityModel(@PathVariable Long id,
            @RequestBody MaturityModelDTO maturityModelDTO) {
        MaturityModelDTO updatedModel = maturityModelService.updateMaturityModel(
                id,
                maturityModelDTO,
                getCurrentUser());
        return ResponseEntity.ok(updatedModel);
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user;
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated.");
    }

}
