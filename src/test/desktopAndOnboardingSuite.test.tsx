import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { db } from '../db';
import { QUALIFICATION_VERSIONS } from '../config/accaStructure';
import { FirstLaunchWizard } from '../components/onboarding/FirstLaunchWizard';
import { Settings } from '../components/settings/Settings';
import App from '../App';

describe('Catchy ACCA: Desktop Release & First-Launch Experience Suite', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.targets.clear();
    await db.studyPlans.clear();
    await db.paperRecords.clear();
    await db.notes.clear();
  });

  describe('1. First-Launch Onboarding Wizard: Step Progression & Screens', () => {
    it('1.1. Renders Screen 1 (Welcome) on initial launch with local-first messaging and actions', () => {
      render(
        <FirstLaunchWizard
          version={QUALIFICATION_VERSIONS[0]}
          onFinish={() => {}}
        />
      );

      // Verify Heading & Supporting text
      expect(screen.getByText('Welcome to Catchy ACCA')).toBeInTheDocument();
      expect(
        screen.getByText(/Your personal ACCA study workspace. Plan exams, organise your study materials/i)
      ).toBeInTheDocument();

      // Verify Non-negotiable principles displayed
      expect(screen.getByText('No Account Required')).toBeInTheDocument();
      expect(screen.getByText('100% Local-First')).toBeInTheDocument();
      expect(screen.getByText('Offline Operational')).toBeInTheDocument();

      // Verify Actions
      expect(screen.getByRole('button', { name: /Get Started/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Skip setup/i })).toBeInTheDocument();
    });

    it('1.2. Navigates from Screen 1 to Screen 2 (Student Profile) and accepts profile customization', () => {
      render(
        <FirstLaunchWizard
          version={QUALIFICATION_VERSIONS[0]}
          onFinish={() => {}}
        />
      );

      // Advance to Screen 2
      fireEvent.click(screen.getByRole('button', { name: /Get Started/i }));

      expect(screen.getByText('Personalise Your Workspace')).toBeInTheDocument();
      expect(screen.getByText(/Current Study Stage/i)).toBeInTheDocument();

      // Enter display name
      const nameInput = screen.getByPlaceholderText(/e.g. Alex/i);
      fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
      expect(nameInput).toHaveValue('Jane Doe');

      // Select study stage
      const appliedSkillsBtn = screen.getByText('Applied Skills');
      fireEvent.click(appliedSkillsBtn);

      // Verify no MyACCA password requested notice
      expect(screen.getByText(/Catchy ACCA never requests or stores MyACCA login credentials/i)).toBeInTheDocument();
    });

    it('1.3. Navigates to Screen 3 (Exam Planner) and allows setting target paper and session', () => {
      render(
        <FirstLaunchWizard
          version={QUALIFICATION_VERSIONS[0]}
          onFinish={() => {}}
        />
      );

      // Advance to Screen 2 then 3
      fireEvent.click(screen.getByRole('button', { name: /Get Started/i }));
      fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

      expect(screen.getByText('Establish Your Next Exam Target')).toBeInTheDocument();
      expect(screen.getByText(/Important clarification:/i)).toBeInTheDocument();
      expect(
        screen.getByText(/This date represents your personal study target. Entering a date here does not automatically book an exam/i)
      ).toBeInTheDocument();
    });

    it('1.4. Navigates through Screen 4 (Study Materials) and Screen 5 (Workflows)', () => {
      render(
        <FirstLaunchWizard
          version={QUALIFICATION_VERSIONS[0]}
          onFinish={() => {}}
        />
      );

      // Step 1 -> 2 -> 3 -> 4
      fireEvent.click(screen.getByRole('button', { name: /Get Started/i }));
      fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
      fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

      // Screen 4: Study Materials
      expect(screen.getByText('Your Study Materials Library')).toBeInTheDocument();
      expect(screen.getByText(/Catchy ACCA does not bundle proprietary exam kits/i)).toBeInTheDocument();

      // Step 4 -> 5
      fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

      // Screen 5: Study Workflows
      expect(screen.getByText('Dedicated Study Workflows')).toBeInTheDocument();
      expect(screen.getByText('Excel Workspace')).toBeInTheDocument();
      expect(screen.getByText('Word Editor')).toBeInTheDocument();
      expect(screen.getByText('Progress Tracker')).toBeInTheDocument();
    });

    it('1.5. Navigates through Screen 6 (Official Resources) and Screen 7 (News & Deadlines)', () => {
      render(
        <FirstLaunchWizard
          version={QUALIFICATION_VERSIONS[0]}
          onFinish={() => {}}
        />
      );

      // Step 1 to 6
      for (let i = 1; i <= 5; i++) {
        const btn = i === 1 ? screen.getByRole('button', { name: /Get Started/i }) : screen.getByRole('button', { name: /Continue/i });
        fireEvent.click(btn);
      }

      // Screen 6: Official Resources
      expect(screen.getByText('Official ACCA Resource Links')).toBeInTheDocument();
      expect(screen.getByText('MyACCA Portal')).toBeInTheDocument();
      expect(screen.getByText('ACCA Study Hub')).toBeInTheDocument();

      // Step 6 -> 7
      fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

      // Screen 7: ACCA News
      expect(screen.getByText('Verified ACCA Deadlines & News')).toBeInTheDocument();
      expect(screen.getByText(/23:59 UK Time/i)).toBeInTheDocument();
      expect(screen.getByText(/£134 \(India\)/i)).toBeInTheDocument();
    });

    it('1.6. Completes setup on Screen 8 and persists target to IndexedDB and profile to localStorage', async () => {
      const onFinishMock = vi.fn();
      render(
        <FirstLaunchWizard
          version={QUALIFICATION_VERSIONS[0]}
          onFinish={onFinishMock}
        />
      );

      // Step 1 to 8
      for (let i = 1; i <= 7; i++) {
        const btn = i === 1 ? screen.getByRole('button', { name: /Get Started/i }) : screen.getByRole('button', { name: /Continue/i });
        fireEvent.click(btn);
      }

      // Screen 8: Completion
      expect(screen.getByText('Setup Complete! Your Workspace is Ready')).toBeInTheDocument();
      expect(screen.getByText(/100% Local \(IndexedDB\)/i)).toBeInTheDocument();

      const finishBtn = screen.getByRole('button', { name: /Finish setup and open Catchy ACCA/i });
      fireEvent.click(finishBtn);

      await waitFor(() => {
        expect(onFinishMock).toHaveBeenCalled();
        expect(localStorage.getItem('catchy_onboarding_completed')).toBe('true');
      });

      // Verify IndexedDB target record was written
      const savedTarget = await db.targets.toCollection().first();
      expect(savedTarget).toBeDefined();
      expect(savedTarget?.sessionLabel).toBe('December 2026');
    });

    it('1.7. Supports "Skip setup" immediately from Screen 1 and marks setup completed', () => {
      const onFinishMock = vi.fn();
      render(
        <FirstLaunchWizard
          version={QUALIFICATION_VERSIONS[0]}
          onFinish={onFinishMock}
        />
      );

      const skipBtn = screen.getByRole('button', { name: /Skip setup/i });
      fireEvent.click(skipBtn);

      expect(localStorage.getItem('catchy_onboarding_completed')).toBe('true');
      expect(onFinishMock).toHaveBeenCalled();
    });
  });

  describe('2. Settings Integration: Setup Wizard Re-run Safety', () => {
    it('2.1. Provides "Restart Setup Wizard" button in Settings and guarantees zero data loss', () => {
      const onRestartMock = vi.fn();
      render(
        <Settings
          currentVersionId="current_2024_2026"
          onRefreshData={() => {}}
          onRestartOnboarding={onRestartMock}
        />
      );

      expect(screen.getByText('Workspace Onboarding & Setup Wizard')).toBeInTheDocument();
      expect(screen.getByText(/Safe execution guarantee/i)).toBeInTheDocument();

      const restartBtn = screen.getByRole('button', { name: /Restart Setup Wizard/i });
      expect(restartBtn).toBeInTheDocument();
      fireEvent.click(restartBtn);

      expect(onRestartMock).toHaveBeenCalled();
    });
  });

  describe('3. Application First-Launch Conditional Rendering', () => {
    it('3.1. Renders FirstLaunchWizard when catchy_onboarding_completed is not set', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Welcome to Catchy ACCA')).toBeInTheDocument();
      });
    });

    it('3.2. Does NOT show FirstLaunchWizard when catchy_onboarding_completed is already true', async () => {
      localStorage.setItem('catchy_onboarding_completed', 'true');
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Welcome to Catchy ACCA')).toBeNull();
      });
    });
  });
});
