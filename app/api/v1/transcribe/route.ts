import { openaiClient } from "@/lib/ai/config";
import { getAuthenticatedUser } from "@/lib/api/middleware";
import {
  createErrorResponse,
  handleApiError,
  ErrorCodes,
} from "@/lib/api/errors";

const ALLOWED_AUDIO_TYPES = [
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/mp3",
  "audio/x-m4a",
  "audio/aac",
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (Whisper limit)

export async function POST(request: Request) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return createErrorResponse("Unauthorized", 401, ErrorCodes.UNAUTHORIZED);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return createErrorResponse(
        "Audio file is required",
        400,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
      return createErrorResponse(
        `Unsupported audio format: ${file.type}`,
        400,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return createErrorResponse(
        "File too large. Maximum size is 25MB.",
        400,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const transcription = await openaiClient.audio.transcriptions.create({
      model: "whisper-1",
      file,
    });

    return Response.json({ text: transcription.text });
  } catch (error) {
    return handleApiError(error);
  }
}
