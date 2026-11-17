export interface Announcement {
    id: string;
    title: string;
    message: string;
    imageUrl: string | null;
    buttonLabel: string | null;
    buttonUrl: string | null;
}

/**
 * What the server answered for the signed-in member, kept for the whole app
 * session: the gate unmounts on pages without the bottom bar, and coming back
 * must neither ask again nor lose an announcement not yet seen.
 */
let session: { userId: string; announcement: Announcement | null } | null = null;

/** undefined = not asked yet for this member; null = nothing to show. */
export const readSession = (userId: string): Announcement | null | undefined =>
    session?.userId === userId ? session.announcement : undefined;

export const writeSession = (userId: string, announcement: Announcement | null) => { session = { userId, announcement }; };

/** For tests. */
export const resetAnnouncementSession = () => { session = null; };

export const isAnnouncement = (v: unknown): v is Announcement =>
    !!v && typeof v === 'object' && typeof (v as Announcement).id === 'string' && typeof (v as Announcement).title === 'string';
