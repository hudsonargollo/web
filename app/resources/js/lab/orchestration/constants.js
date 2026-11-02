/** Turn / lane / safety constants for Lab orchestration. */

export const LANES = Object.freeze({
    CHAT: 'chat',
    BUILD: 'build',
    CLARIFY: 'clarify',
})

export const SESSION_MODES = Object.freeze({
    PLANNING: 'planning',
    BUILDING: 'building',
})

export const SCOPES = Object.freeze({
    NONE: 'none',
    SINGLE_FILE: 'single_file',
    MULTI_FILE: 'multi_file',
    SCAFFOLD: 'scaffold',
})

export const WRITE_MODES = Object.freeze({
    PATCH: 'patch',
    FULL: 'full',
})

export const TURN_STATES = Object.freeze({
    IDLE: 'Idle',
    RECEIVED: 'Received',
    ROUTING: 'Routing',
    CHAT_RESPONDING: 'ChatResponding',
    CLARIFYING: 'Clarifying',
    PLANNING: 'Planning',
    AWAITING_APPROVAL: 'AwaitingApproval',
    EXECUTING: 'Executing',
    TOOL_PENDING: 'ToolPending',
    OBSERVING: 'Observing',
    VALIDATING: 'Validating',
    COMMITTING: 'Committing',
    ROLLING_BACK: 'RollingBack',
    SYNCING_PREVIEW: 'SyncingPreview',
    ABORTING: 'Aborting',
    FAILED: 'Failed',
    PRESENTING: 'Presenting',
})

/** Soft UI labels for turn badges (action language, not mode names). */
export const STATUS_LABELS = Object.freeze({
    [TURN_STATES.RECEIVED]: 'Starting…',
    [TURN_STATES.ROUTING]: 'Waiting for model…',
    [TURN_STATES.CHAT_RESPONDING]: 'Responding…',
    [TURN_STATES.CLARIFYING]: 'Clarifying…',
    [TURN_STATES.PLANNING]: 'Planning…',
    [TURN_STATES.AWAITING_APPROVAL]: 'Waiting for approval…',
    [TURN_STATES.EXECUTING]: 'Working…',
    [TURN_STATES.TOOL_PENDING]: 'Running tools…',
    [TURN_STATES.OBSERVING]: 'Reading results…',
    [TURN_STATES.VALIDATING]: 'Validating…',
    [TURN_STATES.COMMITTING]: 'Applying changes…',
    [TURN_STATES.ROLLING_BACK]: 'Rolling back…',
    [TURN_STATES.SYNCING_PREVIEW]: 'Updating preview…',
    [TURN_STATES.ABORTING]: 'Stopping…',
    [TURN_STATES.FAILED]: 'Failed',
    [TURN_STATES.PRESENTING]: 'Finishing…',
    [TURN_STATES.IDLE]: '',
})

export const ERROR_CLASSES = Object.freeze({
    RECOVERABLE: 'Recoverable',
    CONFLICT: 'Conflict',
    VALIDATION: 'Validation',
    UNCLOSED_TAG: 'UnclosedTag',
    MISSING_IMPORT: 'MissingImport',
    COMPILE_FAILED: 'CompileFailed',
    PATCH_MISS: 'PatchMiss',
    DIFF_LOOP: 'DiffLoop',
    POLICY: 'Policy',
    BUDGET: 'Budget',
    ABORTED: 'Aborted',
})

export const VALIDATOR_OUTCOMES = Object.freeze({
    PASS: 'pass',
    PASS_WITH_WARNING: 'pass_with_warning',
    REPAIR: 'repair',
    SAME_ERROR_ESCALATE: 'same_error_escalate',
    HARD_FAIL: 'hard_fail',
    ABORTED: 'aborted',
})

/** Same-error escalate threshold (consecutive identical class). */
export const SAME_ERROR_ESCALATE_AFTER = 2

/** Max repair rounds before hard fail / rollback. */
export const MAX_REPAIR_ROUNDS = 4

/**
 * Max internal system-fix LLM retries after dry-probe failure
 * (MissingImport / syntax / unresolved module). Stubs may still commit after this.
 */
export const MAX_SYSTEM_FIX_RETRIES = 2

/**
 * Max LLM rounds to drain unresolved AST imports BEFORE dry-probe.
 * 0 = do not bill another model call — write a local fallback module instead.
 */
export const MAX_TOPOLOGY_DRAIN_ROUNDS = 0

/**
 * Consecutive near-identical writes on one file before the diff-loop circuit breaker trips.
 */
export const DIFF_LOOP_IDENTICAL_AFTER = 3

/**
 * Legacy Patch→Write threshold constants (retired; write_file-only world).
 * Kept so older imports do not break.
 */
export const PATCH_TO_WRITE_SMALL_FILE_LINES = 50
export const PATCH_TO_WRITE_ADD_LINES = 50
export const PATCH_TO_WRITE_TOUCH_RATIO = 0.5

/** Max tool rounds inside one Executor pass (batch size). */
export const MAX_TOOL_ROUNDS = 12

/**
 * Max model↔tool continuation rounds for one build turn
 * (explore → write chaining before validation).
 * Kept as a soft legacy default; autonomous builds use MAX_AUTONOMOUS_TURNS.
 */
export const MAX_AGENT_ROUNDS = 1

/**
 * Unattended multi-turn budget for mutation builds (max_tokens resume,
 * truncated/empty writes, topology drain). No user approval between passes.
 * Keep this small — each pass is a full billed Sonnet call.
 */
export const MAX_AUTONOMOUS_TURNS = 4

/** Empty-tool write re-prompts per turn (bootstrap is separate). */
export const MAX_EMPTY_BATCH_REPROMPTS = 1

/** Same rejected paths may auto-continue this many extra times, then stop. */
export const MAX_IDENTICAL_REJECT_CONTINUES = 2

/**
 * Max read/explore tool calls allowed before a Workspace follow-up must write.
 * After this budget, tool_choice is forced to write_file.
 */
export const MAX_EXPLORE_TOOLS_PER_TURN = 2
