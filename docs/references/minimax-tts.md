> ## Documentation Index
> Fetch the complete documentation index at: https://platform.minimax.io/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Synchronous Text to Speech

> Submit the full text in a single HTTP request and get the synthesized audio back, with optional streaming output.

For the US West endpoint, see [Synchronous Text to Speech · Endpoints](/docs/guides/speech-t2a-websocket#endpoints).


## OpenAPI

````yaml api-reference/speech/t2a/api/openapi.json POST /v1/t2a_v2
openapi: 3.1.0
info:
  title: MiniMax T2A API
  description: >-
    MiniMax Text-to-Audio API with support for streaming and non-streaming
    output
  license:
    name: MIT
  version: 1.0.0
servers:
  - url: https://api.minimax.io
security:
  - bearerAuth: []
paths:
  /v1/t2a_v2:
    post:
      tags:
        - Text to Audio
      summary: Text to Audio V2
      operationId: t2aV2
      parameters:
        - name: Content-Type
          in: header
          required: true
          description: >-
            The media type of the request body. Must be set to
            `application/json` to ensure the data is sent in JSON format.
          schema:
            type: string
            enum:
              - application/json
            default: application/json
      requestBody:
        description: ''
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/T2aV2Req'
            examples:
              Request(Non-streaming):
                value:
                  model: speech-2.8-hd
                  text: >-
                    Omg(sighs), the real danger is not that computers start
                    thinking like people, but that people start thinking like
                    computers. Computers can only help us with simple tasks.
                  stream: false
                  language_boost: auto
                  output_format: hex
                  voice_setting:
                    voice_id: English_expressive_narrator
                    speed: 1
                    vol: 1
                    pitch: 0
                  pronunciation_dict:
                    tone:
                      - Omg/Oh my god
                  audio_setting:
                    sample_rate: 32000
                    bitrate: 128000
                    format: mp3
                    channel: 1
                  voice_modify:
                    pitch: 0
                    intensity: 0
                    timbre: 0
                    sound_effects: spacious_echo
              Request(Streaming):
                value:
                  model: speech-2.8-hd
                  text: >-
                    Omg(sighs), the real danger is not that computers start
                    thinking like people, but that people start thinking like
                    computers. Computers can only help us with simple tasks.
                  stream: true
                  language_boost: auto
                  output_format: hex
                  voice_setting:
                    voice_id: English_expressive_narrator
                    speed: 1
                    vol: 1
                    pitch: 0
                  pronunciation_dict:
                    tone:
                      - Omg/Oh my god
                  audio_setting:
                    sample_rate: 32000
                    bitrate: 128000
                    format: mp3
                    channel: 1
                  voice_modify:
                    pitch: 0
                    intensity: 0
                    timbre: 0
                    sound_effects: spacious_echo
        required: true
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/T2aV2Resp'
              examples:
                Request(Non-streaming):
                  value:
                    data:
                      audio: <hex encoded audio>
                      status: 2
                    extra_info:
                      audio_length: 11124
                      audio_sample_rate: 32000
                      audio_size: 179926
                      bitrate: 128000
                      word_count: 163
                      invisible_character_ratio: 0
                      usage_characters: 163
                      audio_format: mp3
                      audio_channel: 1
                    trace_id: 01b8bf9bb7433cc75c18eee6cfa8fe21
                    base_resp:
                      status_code: 0
                      status_msg: success
                Request(Streaming):
                  value:
                    - data:
                        audio: hex encoded audio
                        status: 2
                      extra_info:
                        audio_length: 12910
                        audio_sample_rate: 32000
                        audio_size: 205677
                        bitrate: 128000
                        word_count: 163
                        invisible_character_ratio: 0
                        usage_characters: 163
                        audio_format: mp3
                        audio_channel: 1
                      trace_id: 04ece790375f3ca2edbb44e8c4c200bf
                      base_resp:
                        status_code: 0
                        status_msg: success
                    - data:
                        audio: hex encoded audio_chunk3
                        status: 1
                      trace_id: 01b8bf9bb7433cc75c18eee6cfa8fe21
                      base_resp:
                        status_code: 0
                        status_msg: ''
                    - data:
                        audio: hex encoded audio_chunk2
                        status: 1
                      trace_id: 01b8bf9bb7433cc75c18eee6cfa8fe21
                      base_resp:
                        status_code: 0
                        status_msg: ''
                    - data:
                        audio: hex encoded audio_chunk1
                        status: 1
                      trace_id: 01b8bf9bb7433cc75c18eee6cfa8fe21
                      base_resp:
                        status_code: 0
                        status_msg: ''
            text/event-stream:
              schema:
                $ref: '#/components/schemas/T2aV2Resp'
              examples:
                Request(Streaming):
                  value:
                    - data:
                        audio: hex encoded audio
                        status: 2
                      extra_info:
                        audio_length: 12910
                        audio_sample_rate: 32000
                        audio_size: 205677
                        bitrate: 128000
                        word_count: 163
                        invisible_character_ratio: 0
                        usage_characters: 163
                        audio_format: mp3
                        audio_channel: 1
                      trace_id: 04ece790375f3ca2edbb44e8c4c200bf
                      base_resp:
                        status_code: 0
                        status_msg: success
                    - data:
                        audio: hex encoded audio_chunk3
                        status: 1
                      trace_id: 01b8bf9bb7433cc75c18eee6cfa8fe21
                      base_resp:
                        status_code: 0
                        status_msg: ''
                    - data:
                        audio: hex encoded audio_chunk2
                        status: 1
                      trace_id: 01b8bf9bb7433cc75c18eee6cfa8fe21
                      base_resp:
                        status_code: 0
                        status_msg: ''
                    - data:
                        audio: hex encoded audio_chunk1
                        status: 1
                      trace_id: 01b8bf9bb7433cc75c18eee6cfa8fe21
                      base_resp:
                        status_code: 0
                        status_msg: ''
components:
  schemas:
    T2aV2Req:
      type: object
      required:
        - model
        - text
      properties:
        model:
          type: string
          description: The speech synthesis model version to use.
          enum:
            - speech-2.8-hd
            - speech-2.8-turbo
            - speech-2.6-hd
            - speech-2.6-turbo
            - speech-02-hd
            - speech-02-turbo
            - speech-01-hd
            - speech-01-turbo
        text:
          type: string
          description: >-
            The text to be converted into speech. Must be less than 10,000
            characters.


            - For texts over 3,000 characters, streaming output is recommended.

            - Paragraph breaks should be marked with newline characters.


            - **Pause control**: You can customize speech pauses by adding
            markers in the form `<#x#>`, where `x` is the pause duration in
            seconds. Valid range: `[0.01, 99.99]`, up to two decimal places.
            Pause markers must be placed between speakable text segments and
            cannot be used consecutively.


            - **Inline pronunciation**: Wrap Mandarin Pinyin (with tone number
            `1–5`) or IPA symbols or Cantonese Jyutping (with tone number `1–6`)
            in half-width parentheses to override pronunciation of the target
            word or polyphonic character.
              - `"The word live is pronounced (lɪv) as a verb and (laɪv) as an adjective."`
              - `"This is (he2)平, not (huo4)面."`
              - `"去街市買啲(sung3)。"`

            - **Interjection tags**: Only supported when using `speech-2.8-hd`
            or `speech-2.8-turbo` models. Supported interjections: `(laughs)`,
            `(chuckle)`, `(coughs)`, `(clear-throat)`, `(groans)`, `(breath)`,
            `(pant)`, `(inhale)`, `(exhale)`, `(gasps)`, `(sniffs)`, `(sighs)`,
            `(snorts)`, `(burps)`, `(lip-smacking)`, `(humming)`, `(hissing)`,
            `(emm)`, `(sneezes)`.
        stream:
          type: boolean
          description: Whether to enable streaming output. Defaults to `false`.
        stream_options:
          $ref: '#/components/schemas/T2AStreamOption'
        voice_setting:
          $ref: '#/components/schemas/T2AVoiceSetting'
        audio_setting:
          $ref: '#/components/schemas/T2AAudioSetting'
        pronunciation_dict:
          $ref: '#/components/schemas/PronunciationDict'
        timbre_weights:
          type: array
          description: Timbre weights (legacy field)
          items:
            $ref: '#/components/schemas/TimbreWeights'
        language_boost:
          type: string
          description: >-
            Controls whether recognition for specific minority languages and
            dialects is enhanced. Default is `null`. If the language type is
            unknown, set to `"auto"` and the model will automatically detect it.


            Note: The speech-01 and speech-02 series models do not currently
            support Persian, Filipino, or Tamil.
          enum:
            - Chinese
            - Chinese,Yue
            - English
            - Arabic
            - Russian
            - Spanish
            - French
            - Portuguese
            - German
            - Turkish
            - Dutch
            - Ukrainian
            - Vietnamese
            - Indonesian
            - Japanese
            - Italian
            - Korean
            - Thai
            - Polish
            - Romanian
            - Greek
            - Czech
            - Finnish
            - Hindi
            - Bulgarian
            - Danish
            - Hebrew
            - Malay
            - Persian
            - Slovak
            - Swedish
            - Croatian
            - Filipino
            - Hungarian
            - Norwegian
            - Slovenian
            - Catalan
            - Nynorsk
            - Tamil
            - Afrikaans
            - auto
          default: null
        text_normalization_mode:
          type: string
          description: >-
            Text normalization. `basic` uses fast, rule-based normalization.
            `quality` uses a hybrid LLM + rule-based approach to improve
            normalization quality, with additional latency. See [Text
            Normalization](/guides/speech-t2a-websocket#text-normalization).


            Note:

            - `quality` currently takes effect only for non-streaming requests
            (`stream=false`) with `speech-2.8-hd`, `speech-2.8-turbo`,
            `speech-2.6-hd`, and `speech-2.6-turbo`. For streaming requests or
            other models, `quality` is processed as `basic` and no error is
            returned.

            - When this parameter is set, `voice_setting.text_normalization` is
            ignored. If it is omitted, the `voice_setting.text_normalization`
            setting applies (disabled by default).
          enum:
            - basic
            - quality
          x-mint:
            post:
              - updated
        voice_modify:
          $ref: '#/components/schemas/VoiceModify'
        subtitle_enable:
          type: boolean
          description: >-
            Controls whether subtitles are enabled. Default is false. Available
            for models: `speech-2.8-hd`, `speech-2.8-turbo`, `speech-2.6-hd`,
            `speech-2.6-turbo`, `speech-02-hd`, `speech-02-turbo`,
            `speech-01-hd`, `speech-01-turbo`.
          default: false
        subtitle_type:
          type: string
          description: >-
            Subtitle granularity. Default is `sentence`. Options:

            - `sentence`: sentence-level timestamps

            - `word`: word-level timestamps

            - `word_streaming`: word-level timestamps optimized for streaming,
            only valid when `stream=true`


            In streaming mode (`stream=true`), subtitles are delivered in
            `data.subtitle` along with the audio, and `subtitle_file` is not
            returned:

            - `sentence` / `word`: returned once per segment, on the last audio
            chunk of that segment. `sentence` does not include
            `timestamped_words`

            - `word_streaming`: returned on every audio chunk, carrying the
            cumulative subtitle of the current segment so far
            (`timestamped_words` and `time_end` keep growing). Replace the
            previous result of the same segment with the latest one; a change of
            `text_begin` means a new segment has started


            In non-streaming mode, subtitles are returned as a file via
            `subtitle_file`.
          enum:
            - sentence
            - word
            - word_streaming
          default: sentence
        output_format:
          type: string
          description: >-
            Controls the output format. Options: `[url, hex]`. Default is `hex`.
            Only effective in non-streaming scenarios. In streaming, only `hex`
            is supported. Returned url is valid for 24 hours.
          enum:
            - url
            - hex
          default: hex
    T2aV2Resp:
      type: object
      properties:
        data:
          type: object
          description: >-
            The synthesized audio data object. The returned data object may be
            null, so a null check is required.
          properties:
            audio:
              type: string
              description: >-
                The synthesized audio data, encoded in hexadecimal, with a
                format consistent with the output format specified in the
                request.
            subtitle_file:
              type: string
              description: >-
                Download link for generated subtitles. Subtitles are aligned to
                sentences (≤ 50 characters), timestamped in milliseconds,
                returned in JSON format Returned only for non-streaming requests
                (`stream=false`); for streaming, use `subtitle` / `subtitles`.
            subtitle:
              description: >-
                Returned in streaming mode (`stream=true`) when subtitles are
                enabled. Carries the subtitle of the current segment and is
                delivered with the corresponding audio chunk. Timing depends on
                `subtitle_type`: `sentence` / `word` are returned once on the
                last audio chunk of each segment; `word_streaming` returns the
                cumulative result of the current segment on every audio chunk.
              allOf:
                - $ref: '#/components/schemas/T2ASubtitle'
            subtitles:
              type: array
              description: >-
                Returned in streaming mode (`stream=true`) when subtitles are
                enabled, in the last packet (`status=2`). Aggregates the
                subtitles of all segments in this request.
              items:
                $ref: '#/components/schemas/T2ASubtitle'
            status:
              type: integer
              description: |-
                Current audio stream status.

                `1`: synthesizing
                `2`: synthesis completed
        trace_id:
          type: string
          description: The session ID, used for troubleshooting and support.
        extra_info:
          type: object
          description: Additional audio information.
          properties:
            audio_length:
              type: integer
              format: int64
              description: Audio duration in milliseconds.
            audio_sample_rate:
              type: integer
              format: int64
              description: Audio sample rate.
            audio_size:
              type: integer
              format: int64
              description: File size in bytes.
            bitrate:
              type: integer
              format: int64
              description: Audio bitrate.
            audio_format:
              type: string
              description: 'Output audio format. Options: [mp3, pcm, flac].'
              enum:
                - mp3
                - pcm
                - flac
            audio_channel:
              type: integer
              format: int64
              description: Number of channels. 1 for mono , 2 for stereo.
            invisible_character_ratio:
              type: number
              format: float64
              description: |-
                Proportion of invalid characters.
                If ≤ 10%, audio is generated normally and the ratio is returned.
                If > 10%, an error is returned.
            usage_characters:
              type: integer
              format: int64
              description: Number of billable characters used in this synthesis.
            usage_voice_count:
              type: integer
              format: int64
              description: >-
                Number of voices billed in this request (a voice is charged on
                its first use). Returned only when a voice fee is incurred.
            word_count:
              type: integer
              format: int64
              description: >-
                Number of characters in the synthesized text (punctuation and
                spaces included). For reference only and not used for billing;
                see `usage_characters` for billable characters.
            norm_text_char_count:
              type: integer
              format: int64
              description: >-
                Number of characters processed by high-quality text
                normalization in this request (counted in Unicode characters).
                Returned only for non-streaming requests with
                `text_normalization_mode=quality`; `0` means high-quality
                normalization was not performed (for example, the model does not
                support it). For reference only and currently not used for
                billing.
        base_resp:
          type: object
          description: Status code and details of this request.
          properties:
            status_code:
              type: integer
              format: int64
              description: >-
                Status code.


                `0`: success

                `1000`: unknown error

                `1001`: timeout

                `1002`: rate limit exceeded

                `1004`: authentication failed

                `1039`: TPM rate limit exceeded

                `1042`: invalid characters exceed `10%`

                `2013`: invalid input parameters


                For more details, see [Error Code
                Reference](/api-reference/errorcode).
            status_msg:
              type: string
              description: Status description.
      example:
        data:
          audio: <hex encoded audio>
          status: 2
        extra_info:
          audio_length: 11124
          audio_sample_rate: 32000
          audio_size: 179926
          bitrate: 128000
          word_count: 163
          invisible_character_ratio: 0
          usage_characters: 163
          audio_format: mp3
          audio_channel: 1
        trace_id: 01b8bf9bb7433cc75c18eee6cfa8fe21
        base_resp:
          status_code: 0
          status_msg: success
    T2AStreamOption:
      type: object
      properties:
        exclude_aggregated_audio:
          type: boolean
          description: >-
            Determines whether the final chunk should contain aggregated
            hex-encoded audio data. Default to false, which means the last chunk
            will include the complete audio.
    T2AVoiceSetting:
      type: object
      required:
        - voice_id
      properties:
        voice_id:
          type: string
          description: "The ID of the target voice.  \r\n- To apply mixed voices, configure the `timbre_weights` parameter and leave this value empty.  \r\n- Supports system voices, cloned voices, and AI-generated voices. Below is a selection of the latest system voices (IDs). The full list of available voices can be viewed on the [System Voice ID List](/faq/system-voice-id) or retrieved programmatically using the [Get Voice API](/api-reference/voice-management-get).  \r\n  - Chinese:\r\n    - moss_audio_ce44fc67-7ce3-11f0-8de5-96e35d26fb85\r\n    - moss_audio_aaa1346a-7ce7-11f0-8e61-2e6e3c7ee85d\r\n    - Chinese (Mandarin)_Lyrical_Voice\r\n    - Chinese (Mandarin)_HK_Flight_Attendant\r\n\r\n  - English:\r\n    - English_Graceful_Lady\r\n    - English_Insightful_Speaker\r\n    - English_radiant_girl\r\n    - English_Persuasive_Man\r\n    - moss_audio_6dc281eb-713c-11f0-a447-9613c873494c\r\n    - moss_audio_570551b1-735c-11f0-b236-0adeeecad052\r\n    - moss_audio_ad5baf92-735f-11f0-8263-fe5a2fe98ec8\r\n    - English_Lucky_Robot\r\n\r\n  - Japanese:\r\n    - Japanese_Whisper_Belle\r\n    - moss_audio_24875c4a-7be4-11f0-9359-4e72c55db738\r\n    - moss_audio_7f4ee608-78ea-11f0-bb73-1e2a4cfcd245\r\n    - moss_audio_c1a6a3ac-7be6-11f0-8e8e-36b92fbb4f95\r\n\r\n  - Cantonese (set `language_boost` to `Chinese,Yue`):\r\n    - Cantonese_GentleLady\r\n    - Cantonese_podacast_host_1"
        speed:
          type: number
          format: float
          description: |-
            Speech speed. Higher values result in faster speech.
            Range: `[0.5, 2]` (default: `1.0`).
          minimum: 0.5
          maximum: 2
          default: 1
        vol:
          type: number
          format: float
          description: |-
            Speech volume. Higher values increase loudness.
            Range: `(0, 10]` (default: `1.0`).
          exclusiveMinimum: 0
          maximum: 10
          default: 1
        pitch:
          type: integer
          description: |-
            Speech pitch adjustment.
            Range: `[-12, 12]` (default: `0`, original pitch).
          minimum: -12
          maximum: 12
          default: 0
        emotion:
          type: string
          description: "Emotion control for synthesized speech. Supported values:  `[\"happy\", \"sad\", \"angry\", \"fearful\", \"disgusted\", \"surprised\", \"calm\", \"fluent\", \"whisper\"]`.  \r\n- By default, the model automatically selects the most natural emotion based on text.  Manual specification is only recommended when explicitly needed.  \r\n- Available for models: `speech-2.8-hd`, `speech-2.8-turbo`, `speech-2.6-hd`, `speech-2.6-turbo`, `speech-02-hd`, `speech-02-turbo`, `speech-01-hd`, `speech-01-turbo`.  \r\n- Option `fluent`, `whisper` is only available for models: `speech-2.6-turbo`, `speech-2.6-hd`. `speech-2.8-hd` and `speech-2.8-turbo` do not support `whisper`."
          enum:
            - happy
            - sad
            - angry
            - fearful
            - disgusted
            - surprised
            - calm
            - fluent
            - whisper
        text_normalization:
          type: boolean
          description: >-
            Deprecated. Use the top-level `text_normalization_mode` parameter
            instead: `true` is equivalent to `text_normalization_mode=basic`;
            `false` or omitted is equivalent to omitting
            `text_normalization_mode`. If both are set,
            `text_normalization_mode` takes precedence.


            Enable text normalization (Chinese/English). Improves performance in
            digit-reading scenarios at the cost of slightly higher latency.
            Default: false.
          default: false
          deprecated: true
        latex_read:
          type: boolean
          description: >-
            Enable LaTeX formula reading.


            - Only supports Chinese. When this parameter is enabled,
            `language_boost` will be set to `Chinese`.

            - Formulas must be wrapped with `$$`.

            - If the request contains a formula with `"\"`, it must be escaped
            as `"\\"`.


            Example: The quadratic formula

            ![The quadratic
            formula](https://filecdn.minimax.chat/public/d6f62e9a-cd3f-4f55-a237-257eef531683.png)


            should be written as `$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$`
          default: false
    T2AAudioSetting:
      type: object
      properties:
        sample_rate:
          type: integer
          format: int64
          description: >-
            Specifies the sampling rate of the generated audio. Supported
            values: [`8000`, `16000`, `22050`, `24000`, `32000`, `44100`].
        bitrate:
          type: integer
          format: int64
          description: >-
            Specifies the bitrate of the generated audio. Supported values:
            [`32000`, `64000`, `128000`, `256000`]. 

            Note: This parameter only applies to audio in `mp3` format.
        format:
          type: string
          description: >-
            Specifies the format of the generated audio. Supported values:
            [`mp3`, `pcm`, `flac`, `wav`, `pcmu_raw`, `pcmu_wav`, `opus`].

            Note: `pcmu_raw` and `pcmu_wav` are G.711 μ-law encoded (8 kHz
            sample rate; `pcmu_raw` is headerless raw, `pcmu_wav` is wrapped in
            a WAV container). `opus` is Ogg/Opus encoded.
          enum:
            - mp3
            - pcm
            - flac
            - wav
            - pcmu_raw
            - pcmu_wav
            - opus
          default: mp3
        channel:
          type: integer
          format: int64
          description: >-
            Specifies the number of audio channels. Supported values: [`1`,
            `2`].

            `1` = mono

            `2` = stereo

            Default is `1`.
        force_cbr:
          type: boolean
          description: >-
            Constant Bitrate (CBR) Control

            Set to `true` to enable Constant Bitrate (CBR) for audio encoding.


            Note: This parameter only takes effect when output is **streamed**
            in **MP3** format.
          default: false
    PronunciationDict:
      type: object
      properties:
        tone:
          type: array
          description: >-
            Defines custom pronunciation rules in `original/replacement` format.
            The replacement can be plain text, pinyin with tone numbers in
            parentheses, IPA in parentheses, or Japanese kana (hiragana,
            katakana, romaji — mixable). Multiple rules are applied
            simultaneously.


            Example:

            ```json dark

            "pronunciation_dict": {
              "tone": [
                "resume/(rɪˈzjuːm)",
                "read/(riːd)",
                "处理/(chu3)(li3)",
                "郑栅洁/(zheng4)(shan1)杰",
                "20日/はつか",
                "4桁/よんけた",
                "東京/トウキョウ",
                "omg/oh my god",
                "の/no"
              ]
            }

            ```


            This single dictionary demonstrates: IPA for English polyphonic
            words, pinyin with tone numbers for Chinese, mixed pinyin +
            characters, Japanese hiragana/katakana for date counters and kanji,
            text-to-text expansion, and symbol substitution.


            Chinese tones: `1` = first, `2` = second, `3` = third, `4` = fourth,
            `5` = neutral.
          items:
            type: string
    TimbreWeights:
      type: object
      required:
        - voice_id
        - weight
      properties:
        voice_id:
          type: string
          description: >-
            The ID of the voice used for synthesis. Must be specified together
            with `weight`.

            Supports system voices, cloned voices, and text-to-voice generated
            voices.  The full list of available voices can be viewed on the
            [System Voice ID List](/faq/system-voice-id) or retrieved
            programmatically using the [Get Voice
            API](/api-reference/voice-management-get).  
        weight:
          type: integer
          format: int64
          description: >-
            The weight assigned to each voice. Must be specified together with
            `voice_id`.

            Supported range: `[1, 100]`. Up to 4 voices can be mixed. A higher
            weight value increases similarity to the corresponding voice.


            - Parameter Configuration Example:

            ```json dark

            "timbre_weights": [
              {
                "voice_id": "female-chengshu",
                "weight": 30
              },
              {
                "voice_id": "female-tianmei",
                "weight": 70
              }
            ]

            ```
          minimum: 1
          maximum: 100
      example:
        voice_id: female-chengshu
        weight: 30
    VoiceModify:
      type: object
      description: |-
        Voice effects configuration.

        Supported audio formats:
        - Non-streaming: `mp3`, `wav`, `flac`
        - Streaming: `mp3`
      properties:
        pitch:
          type: integer
          description: >-
            Corresponds to the "Deepen/Brighten" slider on the official page.
            Range: `[-100, 100]`. Values closer to -100 produce a deeper voice,
            while values closer to 100 result in a brighter tone.


            ![pitch
            adjustment](https://filecdn.minimax.chat/public/75af719d-e126-4297-b3cb-416f382e04ec.png)
          minimum: -100
          maximum: 100
        intensity:
          type: integer
          description: >-
            Corresponds to the "Stronger/Softer" slider on the official page.
            Range: `[-100, 100]`. Values closer to -100 create a stronger, more
            forceful sound, while values closer to 100 yield a softer tone.


            ![intensity
            adjustment](https://filecdn.minimax.chat/public/14015a81-d9c4-459b-9536-15c511aac6c0.png)
          minimum: -100
          maximum: 100
        timbre:
          type: integer
          description: >-
            Corresponds to the "Nasal/Crisp" slider on the official page. Range:
            `[-100, 100]`. Values closer to -100 produce a fuller, richer sound,
            while values closer to 100 generate a crisper tone.


            ![timbre
            adjustment](https://filecdn.minimax.chat/public/86ab8ff8-896c-4254-b181-017d9d14000e.png)
          minimum: -100
          maximum: 100
        sound_effects:
          type: string
          description: >-
            Sound effects. Only one can be applied at a time. Options:
            `spacious_echo`, `auditorium_echo`, `lofi_telephone`, `robotic`
          enum:
            - spacious_echo
            - auditorium_echo
            - lofi_telephone
            - robotic
    T2ASubtitle:
      type: object
      description: >-
        Segment subtitle. The engine splits the text into segments (usually one
        sentence each); each segment has one subtitle entry.
      properties:
        text:
          type: string
          description: Segment text.
        text_begin:
          type: integer
          format: int64
          description: >-
            Start character offset of the segment in the synthesized text
            (inclusive).
        text_end:
          type: integer
          format: int64
          description: >-
            End character offset of the segment in the synthesized text
            (exclusive).
        time_begin:
          type: number
          description: >-
            Segment start time in milliseconds, relative to the start of the
            synthesized audio.
        time_end:
          type: number
          description: >-
            Segment end time in milliseconds, relative to the start of the
            synthesized audio.
        timestamped_words:
          type: array
          description: >-
            Word-level timestamps. Returned only when `subtitle_type` is `word`
            / `word_streaming`; `null` for `sentence`.
          items:
            $ref: '#/components/schemas/T2ASubtitleWord'
    T2ASubtitleWord:
      type: object
      description: Word-level timestamp.
      properties:
        word:
          type: string
          description: Word text.
        word_begin:
          type: integer
          format: int64
          description: >-
            Start character offset of the word in the synthesized text
            (inclusive).
        word_end:
          type: integer
          format: int64
          description: >-
            End character offset of the word in the synthesized text
            (exclusive).
        time_begin:
          type: number
          description: Word start time in milliseconds.
        time_end:
          type: number
          description: Word end time in milliseconds.
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: >-
        `HTTP: Bearer Auth`

        - Security Scheme Type: http

        - HTTP Authorization Scheme: `Bearer API_key`, can be found in [Account
        Management>API
        Keys](https://platform.minimax.io/user-center/basic-information/interface-key).

````