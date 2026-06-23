// SBCLOVE module types (mirror sbclove-service response shapes).

export type Intention =
    | 'relation_serieuse'
    | 'faire_connaissance'
    | 'projet_mariage'
    | 'elargir_cercle_social'
    | 'echange_valeurs_respect'
    | 'autre';

export type ProfileStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type ContactChoice = 'pending' | 'wants_contact' | 'declined';

export interface SbcloveStatus {
    enabled: boolean;
    isOpen: boolean;
    timezone: string;
    activeWeekday: number; // 0=Sunday ... 3=Wednesday
    openHour: number;
    closeHour: number;
    nextOpenAt: string | null; // ISO string, null when currently open
}

export interface SbclovePhoto {
    url?: string;
    blurred: boolean;
    order: number;
}

export interface SbcloveProfile {
    id: string;
    userId: string;
    displayName: string;
    sex?: string;
    ageBracket: string | null;
    city?: string;
    country?: string;
    intention: Intention;
    otherIntentionText?: string;
    description: string;
    status: ProfileStatus;
    photos: SbclovePhoto[];
    createdAt?: string;
}

export interface SbcloveMatch {
    matchId: string;
    otherUserId: string;
    displayName: string;
    city?: string;
    ageBracket: string | null;
    intention?: Intention;
    photoUrl?: string;
    myChoice: ContactChoice;
    contactUnlocked: boolean;
    createdAt: string;
}

export interface ExpressInterestResult {
    matched: boolean;
    matchId?: string;
    interestsLeft: number;
}

// Human-readable labels (FR) for the predefined intentions (spec §5).
export const INTENTION_LABELS: Record<Intention, string> = {
    relation_serieuse: 'Relation sérieuse',
    faire_connaissance: 'Faire connaissance',
    projet_mariage: 'Projet de mariage',
    elargir_cercle_social: 'Élargir mon cercle social',
    echange_valeurs_respect: 'Échange basé sur les valeurs et le respect',
    autre: 'Autre intention',
};
