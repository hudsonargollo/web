/** Lab AI stream mutex — readable from guest error hooks without React. */
let streaming = false

export function setLabAiStreaming(on) {
    streaming = Boolean(on)
}

export function isLabAiStreaming() {
    return streaming
}
