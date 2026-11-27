/** Encodes an AudioBuffer as a 16-bit PCM WAV file (mixed down to mono). */
export function encodeWav(buffer: AudioBuffer) {
  const { sampleRate, length, numberOfChannels } = buffer;
  const channels = Array.from({ length: numberOfChannels }, (_, index) =>
    buffer.getChannelData(index)
  );
  const dataSize = length * 2;
  const view = new DataView(new ArrayBuffer(44 + dataSize));

  const writeString = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index++) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  for (let index = 0; index < length; index++) {
    let sample = 0;
    for (const channel of channels) {
      sample += channel[index];
    }
    sample = Math.max(-1, Math.min(1, sample / numberOfChannels));
    view.setInt16(
      44 + index * 2,
      sample < 0 ? sample * 0x8000 : sample * 0x7fff,
      true
    );
  }

  return new Blob([view], { type: "audio/wav" });
}
