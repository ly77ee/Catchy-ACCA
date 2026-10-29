import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import { MyAcca } from '../components/qualification/MyAcca';
import { Settings } from '../components/settings/Settings';
import { Help } from '../components/help/Help';
import { Modal } from '../components/common/Modal';
import { QUALIFICATION_VERSIONS } from '../config/accaStructure';

describe('Catchy ACCA: Windows Release Repair, Dark Theme & GPL-3.0 Migration Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. GNU GPL v3.0 License Migration Verification', () => {
    it('1.1. LICENSE file contains official GNU GPL v3.0 text and copyright notice', () => {
      const licensePath = path.resolve(__dirname, '../../LICENSE');
      expect(fs.existsSync(licensePath)).toBe(true);
      const licenseContent = fs.readFileSync(licensePath, 'utf8');

      expect(licenseContent).toContain('GNU GENERAL PUBLIC LICENSE');
      expect(licenseContent).toContain('Version 3, 29 June 2007');
      expect(licenseContent).toContain('Catchy ACCA · by ly77ee');
      expect(licenseContent).toContain('Copyright (C) 2026 ly77ee');
      // Must not contain standard MIT text as main license
      expect(licenseContent).not.toMatch(/Permission is hereby granted, free of charge, to any person obtaining a copy/i);
    });

    it('1.2. package.json specifies GPL-3.0-only as the project license', () => {
      const pkgPath = path.resolve(__dirname, '../../package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

      expect(pkg.license).toBe('GPL-3.0-only');
      expect(pkg.author).toBe('ly77ee');
    });

    it('1.3. Documentation accurately cites GPL-3.0-only while preserving third-party MIT/Apache notices', () => {
      const readmePath = path.resolve(__dirname, '../../README.md');
      const readmeContent = fs.readFileSync(readmePath, 'utf8');
      expect(readmeContent).toContain('GPL-3.0-only');
      expect(readmeContent).toContain('GNU General Public License');

      const docsReleasePath = path.resolve(__dirname, '../../docs/DESKTOP_RELEASE.md');
      const docsContent = fs.readFileSync(docsReleasePath, 'utf8');
      expect(docsContent).toContain('GNU General Public License v3.0 (GPL-3.0-only)');
    });
  });

  describe('2. Windows x64 Desktop Packaging & Startup Safeguards', () => {
    it('2.1. package.json explicitly targets x64 architecture for Windows NSIS builds', () => {
      const pkgPath = path.resolve(__dirname, '../../package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

      expect(pkg.scripts['package:win']).toContain('--x64');
      expect(pkg.scripts['package:win']).toContain('--win nsis');
      expect(pkg.build.win.target[0].target).toBe('nsis');
      expect(pkg.build.win.target[0].arch).toContain('x64');
    });

    it('2.2. electron/main.cjs includes file logging, fallback show timer, and error dialogs', () => {
      const mainPath = path.resolve(__dirname, '../../electron/main.cjs');
      const mainContent = fs.readFileSync(mainPath, 'utf8');

      // Diagnostic logging
      expect(mainContent).toContain('catchy-acca-startup.log');
      expect(mainContent).toContain('logStartup');

      // Window fallback reveal timeout
      expect(mainContent).toContain('fallbackTimer');
      expect(mainContent).toContain('2500');

      // Native crash/error handling
      expect(mainContent).toContain('uncaughtException');
      expect(mainContent).toContain('did-fail-load');
      expect(mainContent).toContain('dialog.showErrorBox');
    });
  });

  describe('3. Dark-Theme Consistency Across Application Views', () => {
    it('3.1. index.html body is styled with Obsidian dark background #141419', () => {
      const indexPath = path.resolve(__dirname, '../../index.html');
      const indexHtml = fs.readFileSync(indexPath, 'utf8');

      expect(indexHtml).toContain('bg-[#141419]');
      expect(indexHtml).toContain('text-gray-100');
      expect(indexHtml).not.toContain('bg-gray-50 text-gray-900');
    });

    it('3.2. Modal renders with dark background and borders', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          <div>Modal Body Content</div>
        </Modal>
      );

      const modalBox = container.querySelector('.bg-\\[\\#181820\\]');
      expect(modalBox).toBeInTheDocument();
      expect(container.querySelector('.bg-white')).not.toBeInTheDocument();
    });

    it('3.3. My ACCA view renders in dark theme without lingering white backgrounds', () => {
      const { container } = render(
        <MyAcca
          currentVersionId="2024-2027"
          onVersionChange={() => {}}
          paperRecords={{}}
        />
      );

      expect(screen.getByText('My ACCA Qualification Journey')).toBeInTheDocument();
      expect(screen.getByText('Syllabus Architecture')).toBeInTheDocument();

      // Check that all cards use Obsidian dark theme
      const darkCards = container.querySelectorAll('.bg-\\[\\#1e1e24\\]');
      expect(darkCards.length).toBeGreaterThan(0);

      // Verify no lingering light-theme classes in the component DOM
      const whiteBgs = container.querySelectorAll('.bg-white');
      expect(whiteBgs.length).toBe(0);
    });

    it('3.4. Settings view renders in dark theme with GPL-3.0 license card and dependencies', () => {
      const { container } = render(
        <Settings
          currentVersionId="2024-2027"
          onRefreshData={() => {}}
        />
      );

      expect(screen.getByText('Persistence, Backup & System Info')).toBeInTheDocument();
      expect(screen.getByText('GPL-3.0-only')).toBeInTheDocument();
      expect(screen.getAllByText(/GNU General Public License v3\.0/i).length).toBeGreaterThan(0);
      expect(screen.getByText('React 18')).toBeInTheDocument();
      expect(screen.getByText(/MIT License • UI Runtime/i)).toBeInTheDocument();
      expect(screen.getAllByText('Dexie.js').length).toBeGreaterThan(0);

      // Verify no lingering light-theme classes in the component DOM
      const whiteBgs = container.querySelectorAll('.bg-white');
      expect(whiteBgs.length).toBe(0);
    });

    it('3.5. Help view renders in dark theme without lingering white backgrounds', () => {
      const { container } = render(
        <Help
          onNavigate={() => {}}
        />
      );

      expect(screen.getByText('Catchy ACCA User Guide')).toBeInTheDocument();

      const whiteBgs = container.querySelectorAll('.bg-white');
      expect(whiteBgs.length).toBe(0);
    });
  });
});
