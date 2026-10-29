import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopicGrouping } from '../components/topics/TopicGrouping';
import { ExamPlanner } from '../components/planner/ExamPlanner';
import { QUALIFICATION_VERSIONS } from '../config/accaStructure';
import { QuestionRecord, StudyPlanItem, StudentTarget } from '../types';

describe('TopicGrouping & ExamPlanner Component Suite', () => {
  const version = QUALIFICATION_VERSIONS[0];

  const mockQuestions: QuestionRecord[] = [
    {
      id: 'q-1',
      questionNumber: '1',
      title: 'Lease liability under IFRS 16',
      paperId: 'FR',
      topicTags: ['Leases'],
      questionType: 'section_c_constructed',
      notes: 'Initial measurement of right-of-use asset',
      status: 'attempted',
      isDoubt: false,
      confidenceRating: 4,
      attempts: [],
      availableMarks: 20,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'q-2',
      questionNumber: '2',
      title: 'Consolidation of subsidiary fair values',
      paperId: 'FR',
      topicTags: ['Group Financial Statements & Consolidation'],
      questionType: 'section_a_mcq',
      notes: 'Goodwill calculation at acquisition',
      status: 'not_started',
      isDoubt: true,
      confidenceRating: 2,
      attempts: [],
      availableMarks: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  it('renders TopicGrouping and filters questions by active topic', () => {
    const onLaunchPractice = vi.fn();
    render(
      <TopicGrouping
        version={version}
        allQuestions={mockQuestions}
        examAttempts={[]}
        onLaunchPractice={onLaunchPractice}
      />
    );

    expect(screen.getByText('Topic Grouping & Standard Organization')).toBeInTheDocument();
    expect(screen.getByText(/Organize and practice exam questions by accounting standards/i)).toBeInTheDocument();

    // Default topic for FR is Group Financial Statements & Consolidation
    expect(screen.getByText(/Consolidation of subsidiary fair values/i)).toBeInTheDocument();

    // Select Leases topic button
    const leasesButton = screen.getByRole('button', { name: /Leases/i });
    fireEvent.click(leasesButton);

    expect(screen.getByText(/Lease liability under IFRS 16/i)).toBeInTheDocument();
  });

  it('allows launching practice from TopicGrouping', () => {
    const onLaunchPractice = vi.fn();
    render(
      <TopicGrouping
        version={version}
        allQuestions={mockQuestions}
        examAttempts={[]}
        onLaunchPractice={onLaunchPractice}
      />
    );

    // Click Leases topic
    const leasesButton = screen.getByRole('button', { name: /Leases/i });
    fireEvent.click(leasesButton);

    // Launch practice button: "Practise All (1)"
    const launchBtn = screen.getByRole('button', { name: /Practise All/i });
    fireEvent.click(launchBtn);

    expect(onLaunchPractice).toHaveBeenCalledWith('FR', ['q-1']);
  });

  it('renders ExamPlanner and displays study tasks and targets', () => {
    const mockTarget: StudentTarget = {
      id: 'target-1',
      nextExamPaperId: 'FR',
      nextExamDate: '2026-12-05',
      targetScore: 75,
      weeklyStudyHours: 12
    };

    const mockPlans: StudyPlanItem[] = [
      {
        id: 'plan-1',
        paperId: 'FR',
        title: 'Review IFRS 16 lease schedules',
        estimatedMinutes: 45,
        completed: false,
        dueDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      },
      {
        id: 'plan-2',
        paperId: 'FR',
        title: 'Consolidation workings practice',
        estimatedMinutes: 60,
        completed: true,
        dueDate: '2026-12-01',
        createdAt: new Date().toISOString()
      }
    ];

    render(
      <ExamPlanner
        version={version}
        target={mockTarget}
        studyPlans={mockPlans}
        allQuestions={mockQuestions}
        studyMaterials={[]}
      />
    );

    expect(screen.getByText('ACCA Exam Planner & Task Schedule')).toBeInTheDocument();
    expect(screen.getByText('Review IFRS 16 lease schedules')).toBeInTheDocument();
    expect(screen.getByText('Consolidation workings practice')).toBeInTheDocument();
    expect(screen.getByText(/Dec 5, 2026/i)).toBeInTheDocument();
  });
});
