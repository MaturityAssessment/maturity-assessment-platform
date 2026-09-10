package com.master_thesis.maturity_assessment.campaigns.email;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.mail")
@Getter
@Setter
public class CampaignMailProperties {

    private boolean enabled;
    private String from = "";
    private String frontendBaseUrl = "http://localhost:3000/filipevm";
}
