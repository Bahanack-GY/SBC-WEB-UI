import { sbcApiService } from '../../services/SBCApiService';
import { SupportError, supportErrorText, unwrap } from './support';

/**
 * Uploads the files one by one and returns their ids. Throws a SupportError
 * whose message names the file that failed, ready to show.
 */
export async function uploadAttachments(files: File[]): Promise<string[]> {
    const ids: string[] = [];
    for (const file of files) {
        try {
            const data = unwrap<{ id?: string; _id?: string }>(await sbcApiService.supportUploadAttachment(file));
            const id = data?.id ?? data?._id;
            if (!id) throw new SupportError('', 500);
            ids.push(id);
        } catch (e) {
            const status = e instanceof SupportError ? e.status : 0;
            throw new SupportError(`« ${file.name} » n’a pas pu être envoyé. ${supportErrorText(e)}`, status, e instanceof SupportError ? e.code : undefined);
        }
    }
    return ids;
}
