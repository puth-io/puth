package io.puth.spring.example.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HomeController {
    @GetMapping("/")
    public String home() {
        return "Spring Boot Example Home";
    }
    
    @GetMapping("/test")
    public String test() {
        return "Example Test";
    }
}