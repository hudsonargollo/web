import { Children, cloneElement, isValidElement } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-fg text-canvas hover:opacity-90',
        accent: 'bg-accent text-white hover:opacity-90',
        secondary: 'border border-line bg-surface text-fg hover:bg-soft',
        outline: 'border border-line text-fg hover:border-fg/30 hover:bg-soft',
        ghost: 'text-fg-muted hover:bg-soft hover:text-fg',
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-9 px-4',
        lg: 'h-11 px-6 text-[15px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

/**
 * Minimal shadcn-style button primitive for Lab scaffolds.
 * Supports `asChild` so `<Button asChild><Link … /></Button>` merges classes
 * onto the child instead of nesting a button inside a link.
 */
export function Button({
  className,
  variant,
  size,
  type = 'button',
  asChild = false,
  children,
  ...props
}) {
  const classes = cn(buttonVariants({ variant, size }), className)

  if (asChild) {
    const child = Children.only(children)
    if (! isValidElement(child)) {
      throw new Error('Button with asChild expects a single React element child.')
    }
    return cloneElement(child, {
      ...props,
      className: cn(classes, child.props.className),
    })
  }

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  )
}

export { buttonVariants }

export default Button
