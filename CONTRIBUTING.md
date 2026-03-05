# Contributing to GA4 Analyzer

Thank you for considering contributing to GA4 Analyzer! This document provides guidelines and information for developers.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Development Setup](#development-setup)
- [Code Structure](#code-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Pull Request Guidelines](#pull-request-guidelines)

## Architecture Overview

GA4 Analyzer follows a **Clean Architecture** pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│              (CLI, Output Formatting)                    │
├─────────────────────────────────────────────────────────┤
│                    Application Layer                     │
│         (Orchestration, Business Logic)                  │
├─────────────────────────────────────────────────────────┤
│                      Domain Layer                        │
│        (Core Business Logic, Pure Functions)             │
├─────────────────────────────────────────────────────────┤
│                 Infrastructure Layer                     │
│    (API Clients, Config, Auth, Error Handling)          │
└─────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

#### Presentation Layer (`src/presentation/`)
- **cli-handler.ts**: Command-line interface and user interaction
- **output-formatter.ts**: Formats analysis results for display

#### Application Layer (`src/application/`)
- **query-orchestrator.ts**: Coordinates the entire analysis workflow
- **analysis-engine.ts**: Performs multi-axis data analysis
- **insight-generator.ts**: Generates natural language insights

#### Domain Layer (`src/domain/`)
- **query-parser.ts**: Parses natural language queries
- **comparison-logic.ts**: Comparison and filtering logic

#### Infrastructure Layer (`src/infrastructure/`)
- **ga4-client.ts**: GA4 Data API client
- **gsc-client.ts**: Google Search Console API client
- **auth-manager.ts**: Google API authentication
- **config-loader.ts**: Configuration management
- **error-handler.ts**: Error handling utilities
- **performance-monitor.ts**: Performance metrics collection
- **logger.ts**: Logging utilities

#### Types (`src/types/`)
- **models.ts**: TypeScript interfaces and types
- **errors.ts**: Custom error classes

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- TypeScript >= 5.0.0

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd GA4

# Install dependencies
npm install

# Build the project
npm run build

# Link for global use (optional)
npm link
```

### Environment Setup

Create a `.env` file (or set environment variables):

```bash
# GA4 Configuration
export GA4_PROPERTY_ID="your-property-id"
export GA4_SERVICE_ACCOUNT_KEY_PATH="path/to/service-account-key.json"

# GSC Configuration (optional)
export GA4_ENABLE_GSC="true"
export GA4_GSC_SITE_URL="https://example.com"

# Development Options
export GA4_VERBOSE="true"
export GA4_ENABLE_PERFORMANCE_MONITORING="true"
```

## Code Structure

```
src/
├── application/        # Business orchestration
├── bin/               # CLI entry point
├── domain/            # Core business logic
├── infrastructure/    # External integrations
├── presentation/      # User interface
├── types/             # TypeScript definitions
└── index.ts           # Main export file

tests/
├── unit/              # Unit tests
├── integration/       # Integration tests (future)
└── e2e/              # End-to-end tests (future)
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Changes

- Follow the code style guidelines
- Add tests for new functionality
- Update documentation as needed
- Run type checking: `npm run typecheck`
- Run linting: `npm run lint`

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Type checking
npm run typecheck
```

### 4. Build and Test Locally

```bash
# Build
npm run build

# Test the CLI locally
npm run dev -- "昨日のアクセス増の要因"
```

## Testing

### Unit Tests

Location: `tests/unit/`

Unit tests focus on individual functions and classes in isolation.

```typescript
// Example unit test
import { describe, it, expect } from "vitest";
import { QueryParser } from "@/domain/query-parser";

describe("QueryParser", () => {
  it("should parse relative dates correctly", () => {
    const parser = new QueryParser();
    const result = parser.parse("昨日のアクセス", {
      referenceDate: new Date("2026-03-04T00:00:00.000Z"),
    });

    expect(result.targetDate.getUTCDate()).toBe(3);
    expect(result.targetDate.getUTCMonth()).toBe(2);
  });
});
```

### Test Coverage Goals

- **Minimum**: 50% code coverage
- **Target**: 70% code coverage for core logic
- **Focus areas**: Domain layer, comparison logic, query parsing

### Running Tests

```bash
# All tests
npm test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage
```

## Code Style

### TypeScript Guidelines

1. **Strict Type Safety**
   - No `any` or `unknown` types
   - Explicit return types for public functions
   - Use interfaces for object shapes

2. **Naming Conventions**
   - Classes: PascalCase (`QueryParser`)
   - Functions: camelCase (`parseQuery`)
   - Constants: UPPER_SNAKE_CASE (`MAX_RETRIES`)
   - Interfaces: PascalCase with descriptive names (`AnalysisResult`)

3. **Function Design**
   - Keep functions small and focused
   - Avoid side effects in pure functions
   - Use async/await for asynchronous code
   - Prefer functional programming patterns

4. **Error Handling**
   - Use custom error classes from `src/types/errors.ts`
   - Always provide meaningful error messages
   - Use `ErrorHandler` utilities for user-facing errors

### Example Code Style

```typescript
/**
 * Analyzes traffic source data for a given date range
 *
 * @param targetDate - The target date for analysis
 * @param comparisonDate - The comparison date
 * @returns Analysis results with comparison metrics
 * @throws {ApiError} When API request fails
 */
export async function analyzeTrafficSources(
  targetDate: Date,
  comparisonDate: Date,
): Promise<SourceAnalysisResult> {
  // Implementation
}
```

### Linting

We use ESLint with strict TypeScript rules:

```bash
# Run linter
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

**Key ESLint Rules:**
- No console.log (use Logger utilities)
- No non-null assertions (`!`) without justification
- Prefer `const` over `let`
- No unused variables
- Consistent code formatting (managed by Prettier)

## Pull Request Guidelines

### Before Submitting

✅ **Checklist:**
- [ ] Code follows style guidelines
- [ ] All tests pass (`npm test`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Documentation updated (if needed)
- [ ] CHANGELOG.md updated (for significant changes)

### PR Title Format

```
<type>(<scope>): <subject>

Examples:
feat(gsc): add correlation analysis feature
fix(parser): handle edge case in date parsing
docs(readme): update setup instructions
refactor(engine): optimize data transformation
test(parser): add unit tests for query parsing
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes
- `perf`: Performance improvements

### PR Description Template

```markdown
## Description
Brief description of the changes

## Motivation
Why is this change necessary?

## Changes
- Change 1
- Change 2

## Testing
How was this tested?

## Screenshots (if applicable)
Add screenshots for UI changes

## Breaking Changes
List any breaking changes (if any)

## Related Issues
Closes #issue-number
```

### Review Process

1. Automated checks must pass (tests, lint, typecheck)
2. At least one code review approval required
3. All reviewer comments addressed
4. Squash and merge to main branch

## Development Tips

### Debugging

```bash
# Enable verbose logging
npm run dev -- "昨日のアクセス" --verbose

# Enable performance monitoring
export GA4_ENABLE_PERFORMANCE_MONITORING="true"
npm run dev -- "昨日のアクセス" --verbose
```

### Common Issues

**Issue: Authentication errors**
```bash
# Check service account key
cat path/to/service-account-key.json | jq .

# Verify permissions in GA4/GSC
```

**Issue: Build errors**
```bash
# Clean build
rm -rf dist
npm run build
```

**Issue: Test failures**
```bash
# Run specific test file
npx vitest run tests/unit/domain/query-parser.test.ts

# Debug mode
npx vitest run --inspect-brk
```

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Documentation**: See [README.md](README.md) and [API.md](API.md)

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (ISC License).

---

Thank you for contributing to GA4 Analyzer! 🎉
