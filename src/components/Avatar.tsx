import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AvatarProps {
    src?: string;
    alt: string;
    fallback: string;
    className?: string;
    imageClassName?: string;
}

export function Avatar({
    src,
    alt,
    fallback,
    className,
    imageClassName,
}: AvatarProps) {
    const [failed, setFailed] = useState(false);

    useEffect(() => setFailed(false), [src]);

    return (
        <div className={cn("overflow-hidden", className)}>
            {src && !failed ? (
                <img
                    src={src}
                    alt={alt}
                    className={cn("h-full w-full object-cover", imageClassName)}
                    onError={() => setFailed(true)}
                />
            ) : (
                fallback
            )}
        </div>
    );
}
