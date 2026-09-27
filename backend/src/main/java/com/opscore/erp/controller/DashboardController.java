package com.opscore.erp.controller;
import com.opscore.erp.dto.DashboardResponse;
import com.opscore.erp.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
@RestController @RequiredArgsConstructor @RequestMapping("/api/dashboard")
public class DashboardController {
    private final DashboardService service;
    @GetMapping public DashboardResponse get() { return service.getDashboard(); }
}
