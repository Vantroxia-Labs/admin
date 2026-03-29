# Stripping Plan for aegis-admin: Clean React Admin Base

## Status: 📋 Planning → ✅ In Progress

**Approved Plan Summary**:
- Remove demo pages/components (Charts/Forms/Tables/UiElements/Calendar/UserProfiles/Blank/NotFound, ecommerce except Metrics, charts/form).
- Simplify App.tsx routes to core (/ Home, auth).
- Strip demo deps (fullcalendar, jvectormap, apexcharts, dropzone, etc.).
- Clean imports.
- Test.

## Steps (will update as completed):

### 1. [ ] Backup current state (optional: git commit)
### 2. [ ] Remove demo directories/files
### 3. [ ] Edit package.json: remove demo deps
### 4. [ ] Run `npm install`
### 5. [ ] Edit src/App.tsx: simplify routes
### 6. [ ] Edit src/pages/Dashboard/Home.tsx: minimal dashboard (keep Metrics)
### 7. [ ] Remove unused imports/CSS (main.tsx, etc.)
### 8. [ ] Test: `npm run dev` & check core layout/auth/dashboard
### 9. [ ] Update README.md for clean base
### 10. [ ] Complete: remove TODO.md

Next step after each: Confirm success before proceeding.

