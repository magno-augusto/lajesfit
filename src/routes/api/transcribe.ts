import { createFileRoute } from "@tanstack/react-router";

const GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
          return json({ error: "GROQ_API_KEY nao configurada" }, { status: 500 });
        }

        let formData: FormData;
        try {
          formData = await request.formData();
        } catch {
          return json({ error: "Body invalido" }, { status: 400 });
        }

        const audioFile = formData.get("audio");
        if (!audioFile || !(audioFile instanceof Blob)) {
          return json({ error: "Campo 'audio' obrigatorio" }, { status: 400 });
        }

        const ext = audioFile.type.includes("webm")
          ? "webm"
          : audioFile.type.includes("ogg")
            ? "ogg"
            : audioFile.type.includes("mp4")
              ? "mp4"
              : "wav";

        const file = new File([audioFile], `audio.${ext}`, { type: audioFile.type });

        const groqForm = new FormData();
        groqForm.append("file", file);
        groqForm.append("model", "whisper-large-v3-turbo");
        groqForm.append("language", "pt");
        groqForm.append(
          "prompt",
          "arroz, feijao, frango, peixe, ovo, leite, cafe, pao, manteiga, queijo, banana, maca, salada, farofa, macarrao, batata, cenoura, brocolis, espinafre",
        );

        const response = await fetch(GROQ_API_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: groqForm,
        });

        if (!response.ok) {
          const body = await response.text();
          console.error("[transcribe] Groq error:", response.status, body);
          return json(
            { error: "Falha ao transcrever audio", details: response.status },
            { status: 502 },
          );
        }

        const result = (await response.json()) as { text?: string };
        return json({ text: result.text ?? "" });
      },
    },
  },
});
