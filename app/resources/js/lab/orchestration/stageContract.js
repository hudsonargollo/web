/**
 * Client ↔ PHP StageContextContract serializer.
 * Stages: router | planner | executor | chat | clarify
 */

export const AGENT_STAGES = Object.freeze({
    ROUTER: 'router',
    PLANNER: 'planner',
    EXECUTOR: 'executor',
    CHAT: 'chat',
    CLARIFY: 'clarify',
})

export const STAGE_CONTRACT_VERSION = 1

/**
 * Build a wire payload for ChatGateway / LabChatController.
 * @param {string} stage
 * @param {object} pack  output of packContext()
 */
export function toStageContract(stage, pack = {}) {
    return {
        version: STAGE_CONTRACT_VERSION,
        stage,
        pack: pack || {},
    }
}

/**
 * Map orchestration lane → default chat stage when not in build pipeline.
 */
export function stageForLane(lane) {
    if (lane === 'clarify') return AGENT_STAGES.CLARIFY
    if (lane === 'build') return AGENT_STAGES.PLANNER
    return AGENT_STAGES.CHAT
}
