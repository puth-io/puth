---
'@puth/client-java': minor
---

The client depends on Spring Boot 4.1 instead of 3.5, whose open source support ended, and on `spring-boot-starter-webmvc` instead of `spring-boot-starter-web`. Its JSON handling uses Jackson 2.21, which shares its annotations with Jackson 3 of Spring Boot 4. It no longer pins JUnit 5.10, so it runs with JUnit 6 of Spring Boot 4. Java 17 stays the minimum.
