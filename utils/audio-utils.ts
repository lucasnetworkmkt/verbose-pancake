export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private nextPlayTime: number = 0;

  init() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  async playPcmData(base64Data: string) {
    if (!this.audioContext) this.init();
    
    const arrayBuffer = base64ToArrayBuffer(base64Data);
    
    // The Gemini Live API returns 24kHz PCM 16-bit little-endian
    const view = new DataView(arrayBuffer);
    const length = arrayBuffer.byteLength / 2;
    const floatArray = new Float32Array(length);
    
    for (let i = 0; i < length; i++) {
      const int16 = view.getInt16(i * 2, true);
      floatArray[i] = int16 / 32768;
    }
    
    const audioBuffer = this.audioContext!.createBuffer(1, length, 24000);
    audioBuffer.getChannelData(0).set(floatArray);
    
    const source = this.audioContext!.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext!.destination);
    
    const currentTime = this.audioContext!.currentTime;
    if (this.nextPlayTime < currentTime) {
      this.nextPlayTime = currentTime;
    }
    
    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuffer.duration;
  }

  stop() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.nextPlayTime = 0;
  }
}

export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  async start(onData: (base64: string) => void) {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        } 
      });
      
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32Array to Int16Array
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          let s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Convert Int16Array to Base64
        const buffer = new ArrayBuffer(pcmData.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < pcmData.length; i++) {
          view.setInt16(i * 2, pcmData[i], true); // little-endian
        }
        
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = window.btoa(binary);
        
        onData(base64);
      };
      
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
    } catch (err) {
      console.error("Error accessing microphone:", err);
      throw err;
    }
  }

  stop() {
    if (this.processor && this.audioContext) {
      this.processor.disconnect();
      this.source?.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }
}
