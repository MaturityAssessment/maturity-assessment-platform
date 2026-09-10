package com.master_thesis.maturity_assessment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class MaturityAssessmentApplication {

	public static void main(String[] args) {
		SpringApplication.run(MaturityAssessmentApplication.class, args);
	}

}
