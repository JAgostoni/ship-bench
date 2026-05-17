import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import slugify from 'slugify';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function slug(title: string) {
  return slugify(title, { lower: true, strict: true });
}

async function main() {
  await prisma.article.deleteMany();
  await prisma.category.deleteMany();

  const [engineering, product, design, operations, general] = await Promise.all([
    prisma.category.create({ data: { name: 'Engineering', slug: 'engineering' } }),
    prisma.category.create({ data: { name: 'Product', slug: 'product' } }),
    prisma.category.create({ data: { name: 'Design', slug: 'design' } }),
    prisma.category.create({ data: { name: 'Operations', slug: 'operations' } }),
    prisma.category.create({ data: { name: 'General', slug: 'general' } }),
  ]);

  await prisma.article.createMany({
    data: [
      {
        title: 'Engineering Onboarding Guide',
        slug: slug('Engineering Onboarding Guide'),
        content: `# Engineering Onboarding Guide

Welcome to the engineering team! This guide walks you through everything you need to get started.

## Prerequisites

- Node.js 22 or higher
- Docker Desktop
- Git configured with your work email

## Getting Started

1. Clone the main repository
2. Run \`npm install\` to install dependencies
3. Copy \`.env.example\` to \`.env\` and fill in the required values
4. Run \`docker compose up -d\` to start the database
5. Run \`npm run db:migrate && npm run db:seed\`
6. Run \`npm run dev\` and open http://localhost:3000

## Code Standards

We follow conventional commits. All PRs require at least one reviewer before merging. Run \`npm test\` before submitting a PR.`,
        status: 'PUBLISHED',
        categoryId: engineering.id,
      },
      {
        title: 'Engineering Incident Response Playbook',
        slug: slug('Engineering Incident Response Playbook'),
        content: `# Incident Response Playbook

This document outlines the process for responding to production incidents.

## Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| P0    | Complete outage | Immediate |
| P1    | Major degradation | 15 minutes |
| P2    | Minor degradation | 2 hours |

## Steps

1. **Detect** — Alert fires or user report comes in
2. **Acknowledge** — Claim the incident in the incident channel
3. **Mitigate** — Roll back or apply a hotfix
4. **Communicate** — Post updates every 15 minutes
5. **Resolve** — Confirm systems are stable
6. **Retrospective** — Schedule a blameless post-mortem within 48 hours`,
        status: 'PUBLISHED',
        categoryId: engineering.id,
      },
      {
        title: 'Product Roadmap Q3 2026',
        slug: slug('Product Roadmap Q3 2026'),
        content: `# Product Roadmap Q3 2026

## Goals

- Launch the internal knowledge base MVP
- Improve search relevance across all internal tools
- Reduce time-to-answer for new hire questions by 40%

## Key Initiatives

### Knowledge Base MVP

Scope: Article creation, browsing, full-text search, and category filtering.

Timeline: June–July 2026

### Search Improvements

Upgrade to semantic search using embeddings. Integrate with the knowledge base and the HR handbook.

Timeline: August 2026`,
        status: 'PUBLISHED',
        categoryId: product.id,
      },
      {
        title: 'Design System Overview',
        slug: slug('Design System Overview'),
        content: `# Design System Overview

Our design system ensures consistent visual language across all internal tools.

## Core Tokens

- **Primary color**: #2563EB (blue-600)
- **Text**: #111827 (gray-900)
- **Background**: #F9FAFB (gray-50)
- **Border radius**: 6px default, 12px for cards

## Components

All components are built with Tailwind CSS. Avoid one-off styles; always extend the system.

## Usage

Import components from \`src/components\`. Do not duplicate styling logic across features.`,
        status: 'PUBLISHED',
        categoryId: design.id,
      },
      {
        title: 'Office Operations FAQ',
        slug: slug('Office Operations FAQ'),
        content: `# Office Operations FAQ

## How do I book a meeting room?

Use the company calendar system. Rooms are labeled by floor and capacity (e.g., "3F-6" is a 6-person room on floor 3).

## What is the expense policy?

Expenses under $50 can be submitted without prior approval. Anything over $50 requires manager sign-off before purchase.

## How do I get a badge replacement?

Contact IT at #it-support in Slack. Same-day replacements are available before 3pm.`,
        status: 'PUBLISHED',
        categoryId: operations.id,
      },
      {
        title: 'Company Values and Culture',
        slug: slug('Company Values and Culture'),
        content: `# Company Values and Culture

## Our Values

1. **Transparency** — We share information openly and trust our teammates with context.
2. **Ownership** — We take responsibility for outcomes, not just outputs.
3. **Curiosity** — We ask why, learn continuously, and challenge assumptions.
4. **Kindness** — We treat each other with respect in all interactions.

## How We Work

We are a remote-first team. Default to async communication. Use meetings for decisions, not status updates.`,
        status: 'PUBLISHED',
        categoryId: general.id,
      },
      {
        title: 'Draft: Engineering Career Levels',
        slug: slug('Draft Engineering Career Levels'),
        content: `# Engineering Career Levels (DRAFT)

> Work in progress — not yet finalized.

## Proposed Levels

- **L1** — Entry level. Learning core systems and team processes.
- **L2** — Mid level. Delivers features independently with some guidance.
- **L3** — Senior. Leads projects and mentors others.
- **L4** — Staff. Cross-team impact, defines technical direction.

## Criteria

Each level has criteria across: Technical Skills, Collaboration, Impact, and Communication.

_Details to be added after the working group review._`,
        status: 'DRAFT',
        categoryId: engineering.id,
      },
      {
        title: 'Getting Started with Slack',
        slug: slug('Getting Started with Slack'),
        content: `# Getting Started with Slack

Slack is our primary communication tool. Here's what you need to know.

## Key Channels

- **#general** — Company-wide announcements
- **#engineering** — Engineering team discussion
- **#help** — Ask questions, get answers
- **#it-support** — IT and equipment issues

## Etiquette

- Use threads to keep channels readable
- Set a status when you're in deep focus or out of office
- Prefer public channels over DMs for work topics so others can benefit`,
        status: 'PUBLISHED',
        categoryId: null,
      },
    ],
  });

  console.log('Seed complete: 5 categories, 8 articles (1 draft, 1 uncategorized)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
