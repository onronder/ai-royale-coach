import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-primary-foreground border-b-4 border-primary/50 hover:shadow-glow hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-2",
        destructive: "bg-gradient-to-b from-destructive to-destructive/80 text-destructive-foreground border-b-4 border-destructive/50 hover:shadow-defeat hover:-translate-y-0.5",
        outline: "border-2 border-border bg-card/50 hover:bg-card hover:border-primary/50 hover:text-primary",
        secondary: "bg-gradient-to-b from-secondary to-secondary/80 text-secondary-foreground border-b-4 border-secondary/50 hover:shadow-soft hover:-translate-y-0.5",
        ghost: "hover:bg-card hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        glow: "bg-gradient-primary text-primary-foreground shadow-glow hover:shadow-primary-glow border-b-4 border-primary/50 hover:-translate-y-0.5",
        golden: "bg-gradient-gold text-gold-foreground border-b-4 border-gold/50 hover:shadow-gold hover:-translate-y-0.5 font-bold",
        arena: "bg-gradient-royal text-royal-foreground border-b-4 border-royal/50 hover:shadow-royal hover:-translate-y-0.5",
        victory: "bg-gradient-victory text-success-foreground border-b-4 border-success/50 hover:shadow-victory hover:-translate-y-0.5",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-md px-4 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
