# Recoil to Jotai Migration Test Plan

## Overview

This document outlines the testing gaps and recommendations for the Recoil to Jotai migration. The migration touched 190+ files, but test coverage remains at approximately 10% for the frontend codebase. The focus is on testing components and hooks that use the migrated atoms, rather than testing the atoms directly.

## Current Test Coverage Summary

- **Statements**: 10.01% (1937/19333)
- **Branches**: 5.57% (833/14943)
- **Functions**: 6.47% (317/4897)
- **Lines**: 10.05% (1890/18801)

## Critical Components and Hooks Requiring Tests

### 1. Components Using Complex State Patterns (High Priority)

#### Components with Complex State Management:

- ❌ `/client/src/components/Chat/ChatView.tsx` - Central chat component using multiple atoms:
  - Tests conversation switching
  - Tests message submission flow
  - Tests real-time updates
  - Verifies no infinite render loops
- ❌ `/client/src/components/Chat/Input/ChatForm.tsx` - Form submission component:
  - Tests text input state management
  - Tests file attachment handling
  - Tests submission state and abort functionality
  - Verifies atomWithStorage persistence for drafts
- ❌ `/client/src/components/Chat/Messages/MessagesView.tsx` - Message rendering:
  - Tests message tree building from families atom
  - Tests scroll behavior with new messages
  - Verifies no infinite loops in message updates
- ❌ `/client/src/components/Chat/Input/Mention.tsx` - Uses SetStateAction pattern:
  - Tests mention popup behavior
  - Verifies SetStateAction compatibility with Jotai
- ❌ `/client/src/components/Chat/Input/BadgeRow.tsx` - Complex state callbacks:
  - Tests badge state updates
  - Verifies useCallback patterns work correctly
- ❌ `/client/src/components/Chat/TemporaryChat.tsx` - Temporary chat management:
  - Tests temporary message handling
  - Verifies cleanup when switching conversations
- ❌ `/client/src/components/Endpoints/EndpointSettings.tsx` - Endpoint switching:
  - Tests endpoint selection persistence
  - Tests model availability updates
  - Verifies settings saved to localStorage

#### Navigation Components:

- ❌ `/client/src/components/Nav/SettingsTabs/*` - All settings components:
  - Tests settings persistence with atomWithStorage
  - Tests cross-tab synchronization
  - Verifies no duplicate saves
- ❌ `/client/src/components/Nav/SearchBar.tsx` - Search functionality:
  - Tests search state updates
  - Tests debounced search
  - Verifies search results handling

### 2. Hooks with Complex State Logic (High Priority)

#### Critical Hooks Needing Tests:

- ❌ `/client/src/hooks/Chat/useChatHelpers.ts` - Uses useStore pattern:
  - Message regeneration
  - Conversation forking
  - **RISK**: Complex callback patterns that could cause infinite loops
- ❌ `/client/src/hooks/Messages/useBuildMessageTree.ts` - Complex tree building:
  - Message tree construction
  - Parent-child relationships
  - **RISK**: Recursive logic that could cause infinite loops
- ❌ `/client/src/hooks/Input/useTextarea.ts` - Text input management:
  - Textarea state updates
  - Command handling
  - Mention functionality
- ❌ `/client/src/hooks/SSE/useEventHandlers.ts` - Server-sent events:

  - Real-time message updates
  - Error handling
  - **RISK**: Event handler loops

- ❌ `/client/src/hooks/Config/useAppStartup.ts` - Application initialization:
  - Tests initial state loading
  - Tests localStorage recovery
  - Verifies no duplicate initialization
- ❌ `/client/src/hooks/SSE/useSSE.ts` & `/client/src/hooks/SSE/useEventHandlers.ts` - Real-time updates:
  - Tests message streaming
  - Tests error recovery
  - **RISK**: Event handler loops with rapid updates
- ❌ `/client/src/hooks/Audio/useTTSBrowser.ts` & `/client/src/hooks/Audio/useTTSExternal.ts` - Audio state:
  - Tests audio playback state management
  - Tests queue management
  - Verifies cleanup on component unmount

### 3. Data Provider Files (Medium Priority)

- ❌ `/client/src/data-provider/Auth/queries.ts` & `/client/src/data-provider/Auth/mutations.ts`:
  - Tests user state updates after login/logout
  - Verifies token persistence
- ❌ `/client/src/data-provider/Endpoints/queries.ts`:
  - Tests endpoint data caching
  - Tests model availability updates

## Test Recommendations

### 1. Component Integration Tests

Test components that integrate multiple atoms and hooks:

```typescript
// Example: /client/src/components/Chat/__tests__/ChatView.spec.tsx
describe('ChatView', () => {
  it('should handle conversation switching without losing state', () => {});
  it('should persist draft messages when switching conversations', () => {});
  it('should handle rapid message submissions without race conditions', () => {});
  it('should clean up temporary state on unmount', () => {});
});
```

### 2. Hook Tests

Test hooks in isolation with mock atoms:

```typescript
// Example: /client/src/hooks/Chat/__tests__/useChatHelpers.spec.tsx
describe('useChatHelpers', () => {
  it('should regenerate messages without infinite loops', () => {});
  it('should handle conversation forking', () => {});
  it('should update multiple atoms atomically', () => {});
  it('should not re-create callbacks unnecessarily when using store dependency', () => {});
});
```

#### Special Focus: useStore() Pattern Testing
Many hooks now use the Jotai `useStore()` pattern with `[store]` dependency:
```typescript
const store = useStore();
const someCallback = useCallback(() => {
  const value = store.get(someAtom);
  store.set(someAtom, newValue);
}, [store]); // This is safe - store reference is stable
```

**Test Requirements**:
- Verify callbacks using `[store]` don't recreate on every render
- Ensure store.get() returns current values without subscriptions
- Test that store.set() updates work correctly in callbacks

### 3. Edge Case Testing

Focus on potential issues from the migration:

#### Infinite Loop Prevention:

- Test circular dependencies between atoms
- Test derived atoms that depend on themselves
- Test callbacks that trigger state updates

#### Dependency Array Changes (Special Attention):
Files where dependency arrays were updated during migration need testing for:

- ✅ **Low Risk - useStore() pattern**: Multiple hooks now use `[store]` dependency
  - `/client/src/hooks/Agents/*` - useApplyNewAgentTemplate, useGetEphemeralAgent
  - Store utility hooks - useClearAllConversations, useClearAllSubmissions, useClearLatestMessages
  - **Test**: Verify `store` reference remains stable across renders

- ⚠️ **Medium Risk - Setter dependencies**: 
  - `/client/src/hooks/Chat/useChatHelpers.ts` - `[setLatestMessageAtom]` added to useCallback
  - **Test**: Verify setter stability and no unnecessary re-renders

- ✅ **Simplified Dependencies**:
  - `/client/src/components/Endpoints/EndpointSettings.tsx` - Dependencies removed
  - **Test**: Verify functionality still works without the removed dependencies

#### Memory Leaks:

- Test atomFamily cleanup when items are removed
- Test component unmounting with active subscriptions

#### Race Conditions:

- Test rapid state updates
- Test concurrent atom updates
- Test SSE events with simultaneous user actions

### 4. Performance Tests

- Measure render counts before/after migration
- Test with large conversation histories
- Test with many active atomFamily instances

## Priority Test Cases

### P0 - Critical (Must Have):

1. **Infinite Loop Detection Tests**

   - Test all derived atoms for circular dependencies
   - Test useCallback hooks with atom dependencies
   - Test SSE event handlers

2. **State Persistence Tests**

   - Test all atomWithStorage atoms
   - Test cross-tab synchronization
   - Test state recovery after reload

3. **AtomFamily Management Tests**
   - Test creation/deletion of family instances
   - Test memory cleanup
   - Test with large numbers of instances

### P1 - Important:

1. **User Flow Tests**

   - Test complete conversation flow
   - Test message submission and response
   - Test error handling

2. **Migration-Specific Tests**
   - Test SetStateAction support in atomWithUpdater
   - Test atomWithReset functionality
   - Test Jotai store.get/set patterns

### P2 - Nice to Have:

1. **Performance Benchmarks**
2. **Stress Tests**
3. **Browser Compatibility Tests**

## Implementation Strategy

1. **Phase 1**: Create integration tests for critical components (2-3 days)

   - ChatView, ChatForm, MessagesView
   - Settings components with localStorage
   - Endpoint selection components

2. **Phase 2**: Add tests for complex hooks (2-3 days)

   - useChatHelpers, useBuildMessageTree
   - useSSE and event handlers
   - Audio hooks with cleanup logic

3. **Phase 3**: Add edge case and performance tests (1-2 days)

   - Rapid state updates
   - Large conversation histories
   - Cross-tab synchronization

4. **Phase 4**: Run full regression testing (1 day)

## Success Criteria

- Critical components have comprehensive test coverage
- Test coverage for migrated files increases to at least 80%
- No infinite loops or memory leaks detected
- All existing functionality works as before
- Performance is equal or better than Recoil implementation
- localStorage persistence works correctly
- Cross-tab synchronization functions properly

## Notes

- The current test suite passes (340 tests), but coverage is very low
- Focus on testing components and hooks rather than atoms directly
- Special attention needed for atomFamily and derived atom patterns
- Priority on preventing infinite loops and ensuring proper cleanup
- Verify SetStateAction compatibility in components using atomWithUpdater
