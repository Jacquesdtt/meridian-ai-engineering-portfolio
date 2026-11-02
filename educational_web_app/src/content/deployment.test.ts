/** The deployment lesson and its answer keys must agree with the recorded evidence. */
import { describe, expect, it } from 'vitest';
import { DEPLOY } from './facts';
import { GLOSSARY } from './glossary';
import { LESSONS } from './lessons';
import { QUESTIONS } from './questions';
import { QUIZ } from './quiz';
import { VIVA } from './viva';

describe('deployment evidence across teaching and assessment', () => {
  it('uses the recorded deployment status in the quiz, glossary and lesson', () => {
    const quiz = QUIZ.find(q => q.id === 'q8')!;
    expect(quiz.choices[quiz.correctIndex]).toContain(DEPLOY.status);
    expect(GLOSSARY.find(term => term.term === 'ACA')!.def).toContain(DEPLOY.status);
    expect(LESSONS.find(lesson => lesson.moduleId === 'deploy')!.takeaways).toContain(DEPLOY.status);
  });

  it('teaches deployment and teardown in both the recall answer and viva rubric', () => {
    const recall = QUESTIONS.find(q => q.id === 'x4')!;
    if (!('choices' in recall)) throw new Error('Deployment recall needs choices');
    expect(recall.choices[recall.correctIndex]).toMatch(/verified.*torn down/i);
    expect(VIVA.find(prompt => prompt.id === 'v-deploy')!.rubric.join(' ')).toMatch(/verified.*torn down/i);
  });

  it('removes the obsolete scaffold-only explanation from deployment teaching', () => {
    const lesson = LESSONS.find(item => item.moduleId === 'deploy')!;
    const viva = VIVA.find(item => item.id === 'v-deploy')!;
    expect(JSON.stringify({ lesson, viva })).not.toMatch(/still a scaffold|hosting is a scaffold|ACA pending|has not been deployed|placeholder image/);
  });
});
