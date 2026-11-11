package com.master_thesis.maturity_assessment.maturity_models.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/** An ID-free, versioned requirement owned by one practice. */
@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EvidenceRequirement {
    @Column(name = "code", nullable = false, length = 64)
    private String code;
    @Column(name = "name", nullable = false, length = 255)
    private String name;
    @Column(name = "instructions", columnDefinition = "TEXT")
    private String instructions = "";
    @Column(name = "required", nullable = false)
    private Boolean required = true;
    @Enumerated(EnumType.STRING)
    @Column(name = "format", nullable = false, length = 20)
    private Format format = Format.FILE_OR_URL;

    public enum Format { FILE, URL, FILE_OR_URL, ANY }

    public boolean accepts(String type) {
        return format == Format.ANY || (format == Format.FILE_OR_URL && ("FILE".equals(type) || "URL".equals(type)))
                || (format != null && format.name().equals(type));
    }

    public EvidenceRequirement copy() {
        return new EvidenceRequirement(code, name, instructions, required, format);
    }
}
