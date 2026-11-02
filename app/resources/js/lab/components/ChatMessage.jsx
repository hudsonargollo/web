import { AttachmentGallery } from './AttachmentChip'
import { ComposerEditPills } from './ComposerEditPills'
import { ChatMarkdown } from '../lib/chatMarkdown'
import { stripSuggestions, stripTodos } from '../orchestration'
import { LabGlyph } from './Icons'

/** Lab flask — 20px disc matches Thinking / tool row min-h-5. */
export function AssistantAvatar({ className = '' }) {
    return <LabGlyph disc className={className} />
}

export function ChatMessage({ message, hideAvatar = false, isStreaming = false }) {
    const isUser = message.role === 'user'
    const attachments = message.attachments || []
    const editTargets = Array.isArray(message.editTargets) ? message.editTargets : []

    if (isUser) {
        const hasText = Boolean(String(message.content || '').trim())
        const hasAttachments = attachments.length > 0
        const hasTargets = editTargets.length > 0
        // Never leave an empty user shell (padding / flex) in the DOM.
        if (! hasText && ! hasAttachments && ! hasTargets) {
            return null
        }

        return (
            <div className="flex w-full justify-end">
                <div className="ml-auto flex w-fit min-w-0 max-w-[80%] flex-col items-end gap-1.5">
                    {hasAttachments && (
                        <div className="w-full min-w-0">
                            <AttachmentGallery
                                attachments={attachments}
                                size="md"
                                align="end"
                            />
                        </div>
                    )}

                    {hasText || hasTargets ? (
                        <div className="min-w-0 max-w-full whitespace-pre-wrap break-normal [overflow-wrap:break-word] hyphens-none rounded-xl rounded-br-md bg-accent px-3 py-2 text-left text-[13px] leading-snug text-accent-foreground">
                            {hasTargets ? (
                                <ComposerEditPills
                                    targets={editTargets}
                                    variant="bubble"
                                    align="start"
                                    className={hasText ? 'mb-1.5' : ''}
                                />
                            ) : null}
                            {hasText ? message.content : null}
                        </div>
                    ) : null}
                </div>
            </div>
        )
    }

    // Defense in depth: never paint raw <suggestions> / <todos> tags in markdown.
    const visibleContent = stripTodos(stripSuggestions(message.content).visible).visible

    return (
        <div className={['lab-crest-enter flex items-start', hideAvatar ? '' : 'gap-2.5'].join(' ')}>
            {! hideAvatar && <AssistantAvatar />}
            <div className="lab-chat-md-host min-w-0 flex-1 whitespace-pre-wrap break-normal text-[13px] leading-5 [overflow-wrap:break-word] hyphens-none">
                <ChatMarkdown content={visibleContent} isStreaming={isStreaming} />
            </div>
        </div>
    )
}
