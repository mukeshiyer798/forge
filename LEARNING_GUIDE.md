# FORGE Codebase Learning Guide

A comprehensive guide to understanding and improving the FORGE platform codebase.

---

## Frontend Technologies

### React 18 Fundamentals
- **Official React Docs**: https://react.dev/learn
- **React Hooks Deep Dive**: https://react.dev/reference/react
- **React Patterns**: https://reactpatterns.com/
- **Thinking in React**: https://react.dev/learn/thinking-in-react

### TypeScript
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/handbook/intro.html
- **TypeScript Deep Dive**: https://basarat.gitbook.io/typescript/
- **TypeScript React Patterns**: https://react-typescript-cheatsheet.netlify.app/
- **Advanced TypeScript Types**: https://www.typescriptlang.org/docs/handbook/2/types-from-types.html

### Vite Build System
- **Vite Documentation**: https://vitejs.dev/guide/
- **Vite Plugin Development**: https://vitejs.dev/guide/api-plugin.html
- **Build Optimization**: https://vitejs.dev/guide/performance.html

### State Management with Zustand
- **Zustand Documentation**: https://docs.pmnd.rs/zustand/getting-started/introduction
- **Zustand Patterns**: https://docs.pmnd.rs/zustand/guides/practice-with-no-store-actions
- **State Management Best Practices**: https://kentcdodds.com/blog/application-state-management-with-react
- **Zustand Middleware (persist)**: https://docs.pmnd.rs/zustand/integrations/persisting-store-data

### Tailwind CSS & Design Systems
- **Tailwind CSS Documentation**: https://tailwindcss.com/docs
- **Tailwind Best Practices**: https://tailwindcss.com/docs/reusing-styles
- **Design System Patterns**: https://www.designsystems.com/
- **Custom Design Tokens**: https://tailwindcss.com/docs/theme
- **Responsive Design**: https://tailwindcss.com/docs/responsive-design

### Framer Motion (Animations)
- **Framer Motion Docs**: https://www.framer.com/motion/
- **Animation Principles**: https://www.framer.com/motion/animation/
- **Layout Animations**: https://www.framer.com/motion/layout-animations/
- **Gesture Animations**: https://www.framer.com/motion/gestures/
- **Performance Optimization**: https://www.framer.com/motion/performance/

### Radix UI (Accessible Components)
- **Radix UI Documentation**: https://www.radix-ui.com/primitives/docs/overview/introduction
- **Accessibility Guide**: https://www.radix-ui.com/primitives/docs/guides/accessibility
- **Component Composition**: https://www.radix-ui.com/primitives/docs/guides/composition
- **shadcn/ui Pattern**: https://ui.shadcn.com/docs

---

## Backend Technologies

### FastAPI Framework
- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **FastAPI Tutorial**: https://fastapi.tiangolo.com/tutorial/
- **API Design Best Practices**: https://fastapi.tiangolo.com/tutorial/bigger-applications/
- **Dependency Injection**: https://fastapi.tiangolo.com/tutorial/dependencies/
- **Background Tasks**: https://fastapi.tiangolo.com/tutorial/background-tasks/

### SQLModel (ORM)
- **SQLModel Documentation**: https://sqlmodel.tiangolo.com/
- **SQLModel Tutorial**: https://sqlmodel.tiangolo.com/tutorial/
- **Relationships**: https://sqlmodel.tiangolo.com/tutorial/relationship-attributes/
- **Query Building**: https://sqlmodel.tiangolo.com/tutorial/select/

### Pydantic (Data Validation)
- **Pydantic Documentation**: https://docs.pydantic.dev/
- **Pydantic V2 Guide**: https://docs.pydantic.dev/latest/
- **Field Validation**: https://docs.pydantic.dev/latest/concepts/validators/
- **Settings Management**: https://docs.pydantic.dev/latest/concepts/pydantic_settings/

### PostgreSQL Database
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **PostgreSQL Tutorial**: https://www.postgresql.org/docs/current/tutorial.html
- **Indexing Strategies**: https://www.postgresql.org/docs/current/indexes.html
- **Query Optimization**: https://www.postgresql.org/docs/current/performance-tips.html

### Alembic (Database Migrations)
- **Alembic Documentation**: https://alembic.sqlalchemy.org/
- **Migration Tutorial**: https://alembic.sqlalchemy.org/en/latest/tutorial.html
- **Auto-generate Migrations**: https://alembic.sqlalchemy.org/en/latest/autogenerate.html
- **Migration Best Practices**: https://alembic.sqlalchemy.org/en/latest/branches.html

---

## Architecture & Design Patterns

### Component-Based Architecture
- **React Component Patterns**: https://react.dev/learn/your-first-component
- **Composition vs Inheritance**: https://react.dev/learn/passing-data-deeply-with-context
- **Container/Presenter Pattern**: https://kentcdodds.com/blog/container-components
- **Compound Components**: https://kentcdodds.com/blog/compound-components-with-react-hooks

### State Management Patterns
- **Flux Architecture**: https://facebook.github.io/flux/docs/in-depth-overview/
- **Redux Patterns**: https://redux.js.org/tutorials/fundamentals/part-2-concepts-data-flow
- **Zustand Patterns**: https://github.com/pmndrs/zustand#middleware
- **Local vs Global State**: https://kentcdodds.com/blog/application-state-management-with-react

### API Design Patterns
- **RESTful API Design**: https://restfulapi.net/
- **REST Best Practices**: https://restfulapi.net/rest-api-design-tutorial-with-example/
- **API Versioning**: https://www.baeldung.com/rest-versioning
- **Error Handling**: https://fastapi.tiangolo.com/tutorial/handling-errors/

### Repository Pattern
- **Repository Pattern Explained**: https://martinfowler.com/eaaCatalog/repository.html
- **SQLModel Repository**: https://sqlmodel.tiangolo.com/tutorial/select/
- **Data Access Layer**: https://docs.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design

### Dependency Injection
- **Dependency Injection in FastAPI**: https://fastapi.tiangolo.com/tutorial/dependencies/
- **Dependency Patterns**: https://fastapi.tiangolo.com/advanced/dependencies/
- **Testing with Dependencies**: https://fastapi.tiangolo.com/tutorial/testing/

### Service Layer Pattern
- **Service Layer Architecture**: https://martinfowler.com/eaaCatalog/serviceLayer.html
- **Business Logic Separation**: https://www.baeldung.com/spring-service-layer
- **CRUD Operations**: https://fastapi.tiangolo.com/tutorial/sql-databases/

---

## Security & Authentication

### JWT (JSON Web Tokens)
- **JWT Introduction**: https://jwt.io/introduction
- **JWT Best Practices**: https://datatracker.ietf.org/doc/html/rfc8725
- **Token Security**: https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/
- **FastAPI JWT**: https://fastapi.tiangolo.com/advanced/security/oauth2-scopes/

### Password Hashing
- **Password Security**: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- **Argon2 & Bcrypt**: https://github.com/microsoft/pwdlib
- **OWASP Authentication**: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

### OWASP Top 10 Security Risks
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **API Security**: https://owasp.org/www-project-api-security/
- **Input Validation**: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
- **SQL Injection Prevention**: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
- **XSS Prevention**: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html

### RBAC (Role-Based Access Control)
- **RBAC Concepts**: https://en.wikipedia.org/wiki/Role-based_access_control
- **FastAPI Security**: https://fastapi.tiangolo.com/advanced/security/
- **Permission Systems**: https://fastapi.tiangolo.com/tutorial/security/oauth2-scopes/

---

## DevOps & Deployment

### Docker & Docker Compose
- **Docker Documentation**: https://docs.docker.com/
- **Docker Compose**: https://docs.docker.com/compose/
- **Multi-stage Builds**: https://docs.docker.com/build/building/multi-stage/
- **Docker Best Practices**: https://docs.docker.com/develop/dev-best-practices/

### Traefik (Reverse Proxy)
- **Traefik Documentation**: https://doc.traefik.io/traefik/
- **Docker Provider**: https://doc.traefik.io/traefik/providers/docker/
- **HTTPS/SSL**: https://doc.traefik.io/traefik/https/overview/
- **Load Balancing**: https://doc.traefik.io/traefik/routing/services/

### CI/CD with GitHub Actions
- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **CI/CD Best Practices**: https://docs.github.com/en/actions/guides
- **Docker in CI/CD**: https://docs.github.com/en/actions/publishing-packages/publishing-docker-images

### Environment Management
- **Environment Variables**: https://12factor.net/config
- **Secrets Management**: https://docs.docker.com/compose/environment-variables/
- **Configuration Patterns**: https://pydantic-docs.helpmanual.io/usage/settings/

---

## Testing

### Frontend Testing
- **React Testing Library**: https://testing-library.com/react
- **Jest Documentation**: https://jestjs.io/docs/getting-started
- **Component Testing**: https://kentcdodds.com/blog/common-mistakes-with-react-testing-library
- **E2E Testing**: https://playwright.dev/

### Backend Testing
- **Pytest Documentation**: https://docs.pytest.org/
- **FastAPI Testing**: https://fastapi.tiangolo.com/tutorial/testing/
- **Test Fixtures**: https://docs.pytest.org/en/stable/fixture.html
- **Test Coverage**: https://coverage.readthedocs.io/

### Test-Driven Development (TDD)
- **TDD Fundamentals**: https://www.agilealliance.org/glossary/tdd/
- **TDD Cycle**: https://martinfowler.com/bliki/TestDrivenDevelopment.html
- **Testing Pyramid**: https://martinfowler.com/articles/practical-test-pyramid.html

---

## Product & UX Design

### User Experience (UX) Design
- **UX Design Principles**: https://www.interaction-design.org/literature/topics/ux-design
- **Information Architecture**: https://www.usability.gov/what-and-why/information-architecture.html
- **Progressive Disclosure**: https://www.nngroup.com/articles/progressive-disclosure/
- **Cognitive Load Theory**: https://www.nngroup.com/articles/minimize-cognitive-load/

### Gamification Design
- **Gamification Elements**: https://www.gamify.com/what-is-gamification
- **Streak Systems**: https://www.nngroup.com/articles/gamification-ux/
- **Progress Indicators**: https://www.nngroup.com/articles/progress-indicators/
- **Duolingo's Approach**: https://www.duolingo.com/approach

### Learning Science
- **Learning How to Learn**: https://www.coursera.org/learn/learning-how-to-learn
- **Spaced Repetition**: https://en.wikipedia.org/wiki/Spaced_repetition
- **Active Recall**: https://www.cambridge.org/core/journals/behavioral-and-brain-sciences/article/abs/retrievalbased-learning/9A0C0C5A5B5C5D5E5F5G5H5I5J5K5L5M5N5O5P5Q5R5S5T5U5V5W5X5Y5Z
- **Feynman Technique**: https://fs.blog/feynman-learning-technique/
- **Deliberate Practice**: https://fs.blog/deliberate-practice-guide/

### Goal Setting & Tracking
- **SMART Goals**: https://www.mindtools.com/pages/article/smart-goals.htm
- **OKR Framework**: https://www.whatmatters.com/resources/okr-meaning-definition-example
- **Habit Tracking**: https://jamesclear.com/habit-tracker
- **Progress Visualization**: https://www.nngroup.com/articles/progress-indicators/

---

## Performance Optimization

### Frontend Performance
- **React Performance**: https://react.dev/learn/render-and-commit
- **Code Splitting**: https://react.dev/reference/react/lazy
- **Memoization**: https://react.dev/reference/react/memo
- **Bundle Optimization**: https://vitejs.dev/guide/performance.html
- **Web Vitals**: https://web.dev/vitals/

### Backend Performance
- **FastAPI Performance**: https://fastapi.tiangolo.com/advanced/async/
- **Database Optimization**: https://www.postgresql.org/docs/current/performance-tips.html
- **Query Optimization**: https://use-the-index-luke.com/
- **Caching Strategies**: https://fastapi.tiangolo.com/advanced/caching/

### Database Optimization
- **PostgreSQL Performance**: https://www.postgresql.org/docs/current/performance-tips.html
- **Indexing**: https://www.postgresql.org/docs/current/indexes.html
- **Query Planning**: https://www.postgresql.org/docs/current/using-explain.html
- **Connection Pooling**: https://www.postgresql.org/docs/current/runtime-config-connection.html

---

## Accessibility (a11y)

### Web Accessibility
- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **ARIA Attributes**: https://www.w3.org/WAI/ARIA/apg/
- **Keyboard Navigation**: https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html
- **Screen Readers**: https://www.w3.org/WAI/ARIA/apg/patterns/

### React Accessibility
- **React A11y**: https://react.dev/learn/accessibility
- **Radix UI A11y**: https://www.radix-ui.com/primitives/docs/guides/accessibility
- **Accessible Forms**: https://www.w3.org/WAI/tutorials/forms/
- **Focus Management**: https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html

---

## Data Modeling & Database Design

### Database Design Principles
- **Database Normalization**: https://en.wikipedia.org/wiki/Database_normalization
- **Entity Relationship Modeling**: https://www.lucidchart.com/pages/er-diagrams
- **SQLModel Relationships**: https://sqlmodel.tiangolo.com/tutorial/relationship-attributes/
- **Foreign Keys & Constraints**: https://www.postgresql.org/docs/current/ddl-constraints.html

### Data Validation
- **Pydantic Validation**: https://docs.pydantic.dev/latest/concepts/validators/
- **Input Sanitization**: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
- **SQL Injection Prevention**: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html

---

## API Design & Integration

### RESTful API Design
- **REST Principles**: https://restfulapi.net/
- **HTTP Methods**: https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods
- **Status Codes**: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
- **API Versioning**: https://www.baeldung.com/rest-versioning

### API Documentation
- **OpenAPI/Swagger**: https://swagger.io/specification/
- **FastAPI Docs**: https://fastapi.tiangolo.com/tutorial/metadata/
- **API Documentation Best Practices**: https://swagger.io/resources/articles/adopting-an-api-first-approach/

### Frontend-Backend Integration
- **Fetch API**: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
- **Error Handling**: https://kentcdodds.com/blog/get-a-catch-block-error-message-with-typescript
- **Loading States**: https://kentcdodds.com/blog/stop-using-isloading-booleans
- **Optimistic Updates**: https://kentcdodds.com/blog/optimistic-ui-patterns

---

## Code Quality & Best Practices

### TypeScript Best Practices
- **TypeScript Style Guide**: https://github.com/basarat/typescript-book
- **Type Safety**: https://www.typescriptlang.org/docs/handbook/type-checking-javascript-files.html
- **Code Organization**: https://kentcdodds.com/blog/file-structure

### Python Best Practices
- **PEP 8 Style Guide**: https://peps.python.org/pep-0008/
- **Python Type Hints**: https://docs.python.org/3/library/typing.html
- **Code Organization**: https://docs.python-guide.org/writing/structure/

### Code Review Practices
- **Code Review Guidelines**: https://google.github.io/eng-practices/review/
- **Pull Request Best Practices**: https://www.atlassian.com/git/tutorials/making-a-pull-request
- **Clean Code Principles**: https://github.com/ryanmcdermott/clean-code-javascript

### Linting & Formatting
- **ESLint**: https://eslint.org/docs/latest/
- **Prettier**: https://prettier.io/docs/en/
- **Ruff (Python)**: https://docs.astral.sh/ruff/
- **MyPy (Python)**: https://mypy.readthedocs.io/

---

## Product Management & Strategy

### Product Development
- **Product Management**: https://www.productplan.com/glossary/product-management/
- **User Stories**: https://www.atlassian.com/agile/project-management/user-stories
- **MVP Development**: https://www.productplan.com/glossary/minimum-viable-product/
- **Feature Prioritization**: https://www.productplan.com/glossary/prioritization/

### User Research
- **User Research Methods**: https://www.nngroup.com/articles/user-research/
- **User Personas**: https://www.nngroup.com/articles/personas/
- **User Journey Mapping**: https://www.nngroup.com/articles/journey-mapping-101/
- **Usability Testing**: https://www.nngroup.com/articles/usability-testing-101/

### Metrics & Analytics
- **Product Metrics**: https://www.productplan.com/glossary/product-metrics/
- **User Analytics**: https://analytics.google.com/analytics/academy/
- **A/B Testing**: https://www.optimizely.com/optimization-glossary/ab-testing/
- **Conversion Optimization**: https://www.nngroup.com/articles/conversion-rate/

---

## Visual Design & Graphics

### Design Principles
- **Visual Hierarchy**: https://www.interaction-design.org/literature/topics/visual-hierarchy
- **Color Theory**: https://www.interaction-design.org/literature/topics/color-theory
- **Typography**: https://www.interaction-design.org/literature/topics/typography
- **Spacing & Layout**: https://www.interaction-design.org/literature/topics/grid-systems

### Illustration & Graphics
- **SVG Graphics**: https://developer.mozilla.org/en-US/docs/Web/SVG
- **Icon Design**: https://www.iconfinder.com/learn/icon-design-guide
- **Data Visualization**: https://www.tableau.com/learn/articles/data-visualization
- **Chart.js/Recharts**: https://www.chartjs.org/docs/latest/ | https://recharts.org/

### Design Systems
- **Design System Guide**: https://www.designsystems.com/
- **Component Libraries**: https://storybook.js.org/
- **Design Tokens**: https://www.lightningdesignsystem.com/design-tokens/
- **Material Design**: https://m3.material.io/

---

## Advanced Topics

### Microservices Architecture
- **Microservices Patterns**: https://microservices.io/patterns/
- **Service Communication**: https://microservices.io/patterns/communication-style/
- **API Gateway**: https://microservices.io/patterns/apigateway.html

### Event-Driven Architecture
- **Event Sourcing**: https://martinfowler.com/eaaDev/EventSourcing.html
- **Message Queues**: https://www.rabbitmq.com/getstarted.html
- **Pub/Sub Patterns**: https://cloud.google.com/pubsub/docs/overview

### Caching Strategies
- **Caching Patterns**: https://aws.amazon.com/caching/
- **Redis**: https://redis.io/docs/
- **Cache Invalidation**: https://martinfowler.com/bliki/TwoHardThings.html

### Monitoring & Observability
- **Application Monitoring**: https://www.datadoghq.com/knowledge-center/application-monitoring/
- **Logging Best Practices**: https://www.loggly.com/ultimate-guide/python-logging-basics/
- **Error Tracking**: https://sentry.io/for/developers/
- **Performance Monitoring**: https://www.newrelic.com/platform/application-performance-monitoring

---

## Learning Resources by Skill Level

### Beginner
- React Official Tutorial
- FastAPI Tutorial
- TypeScript Handbook (Basic Types)
- Tailwind CSS Getting Started
- Docker Getting Started

### Intermediate
- React Advanced Patterns
- FastAPI Advanced Features
- TypeScript Advanced Types
- State Management Deep Dive
- Database Design Principles

### Advanced
- React Performance Optimization
- FastAPI Async Patterns
- TypeScript Type System Mastery
- System Architecture Design
- Security Hardening

---

## Recommended Learning Path

### Week 1-2: Foundations
1. React & TypeScript basics
2. FastAPI & Python basics
3. Docker fundamentals
4. Git & version control

### Week 3-4: Core Development
1. Component architecture
2. State management (Zustand)
3. API design & integration
4. Database modeling

### Week 5-6: Advanced Features
1. Authentication & security
2. Testing strategies
3. Performance optimization
4. Deployment & DevOps

### Week 7-8: Product & UX
1. UX design principles
2. Gamification patterns
3. Learning science
4. Product metrics

---

## Quick Reference

### Essential Commands
```bash
# Frontend
npm install
npm run dev
npm run build

# Backend
uv run pytest
uv run alembic revision --autogenerate
uv run alembic upgrade head

# Docker
docker compose up -d
docker compose logs -f
docker compose exec backend bash
```

### Key File Locations
- Frontend Store: `frontend/src/store/useAppStore.ts`
- Backend Models: `backend/app/models.py`
- API Routes: `backend/app/api/routes/`
- Components: `frontend/src/components/`
- Types: `frontend/src/types/index.ts`

---

*Last Updated: 2026-02-19*
