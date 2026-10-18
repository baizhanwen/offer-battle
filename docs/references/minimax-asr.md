> ## Documentation Index
> Fetch the complete documentation index at: https://platform.minimax.io/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Speech to Text

> Use this API to transcribe an audio file into text, with support for streaming output, speaker diarization and subtitle export.



## OpenAPI

````yaml api-reference/speech/speech-to-text/api/openapi.json POST /v1/speech_to_text
openapi: 3.1.0
info:
  title: MiniMax ASR API
  description: MiniMax Speech-to-Text API with support for one-shot and streaming output
  license:
    name: MIT
  version: 1.0.0
servers:
  - url: https://api.minimax.io
security:
  - bearerAuth: []
paths:
  /v1/speech_to_text:
    post:
      tags:
        - SpeechToText
      summary: Speech to Text
      operationId: speechToText
      parameters:
        - name: Content-Type
          in: header
          required: true
          description: The media type of the request body. Must be `multipart/form-data`.
          schema:
            type: string
            enum:
              - multipart/form-data
            default: multipart/form-data
        - name: language
          in: header
          required: false
          description: >-
            An optional [BCP-47 language
            tag](https://www.rfc-editor.org/info/bcp47/) that hints at the
            primary spoken language. Omit this header or pass an empty value to
            enable mixed-language recognition.


            Currently supported values: `zh` (Chinese), `yue` (Cantonese), `en`
            (English), `ja` (Japanese), `ko` (Korean), `th` (Thai), `vi`
            (Vietnamese), `id` (Indonesian), `ms` (Malay), `fil` (Filipino),
            `ar` (Arabic), `tr` (Turkish), `fr` (French), `de` (German), `es`
            (Spanish), `it` (Italian), `pt` (Portuguese), `pl` (Polish), `ru`
            (Russian), and `uk` (Ukrainian).
          schema:
            type: string
            default: ''
            example: en
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required:
                - model
                - file
              properties:
                model:
                  type: string
                  description: The model version used for this request.
                  enum:
                    - asr-1.0
                  default: asr-1.0
                  example: asr-1.0
                file:
                  type: string
                  format: binary
                  description: >-
                    The audio file to transcribe. Provide the path to the file.


                    The uploaded audio file must meet the following
                    requirements:


                    | Item | Constraint |

                    | --- | --- |

                    | Format | `wav` / `aiff` / `flac` / `alac`(m4a) / `mp3` /
                    `aac` / `opus` / `ogg` |

                    | Duration | No longer than **500 seconds**. Exceeding this
                    returns `400`; the audio is never silently truncated |

                    | Size | No larger than **50 MB**. Exceeding this returns
                    `413` |


                    Raw PCM without a container is not supported.


                    Speech recognition does not benefit from high sample rates
                    or stereo. Uncompressed high-specification audio easily
                    exceeds the size limit (for example, 500 seconds of 48 kHz
                    stereo WAV is about 92 MB). Convert to mono 16 kHz, or use a
                    compressed format such as `mp3` / `aac` / `opus`; the
                    transcription result is unaffected.
                response_format:
                  type: string
                  description: >-
                    The format of the transcription result.


                    | Value | Returns | Response type |

                    | --- | --- | --- |

                    | `json` | `text` + `duration` | `application/json` |

                    | `verbose_json` | `text` + `duration` + `segments` +
                    `n_speakers` (includes speaker diarization and timestamps) |
                    `application/json` |

                    | `srt` | SRT subtitles | `text/plain` |

                    | `vtt` | WebVTT subtitles | `text/vtt` |


                    `verbose_json` / `srt` / `vtt` enable speaker diarization
                    and forced alignment, and therefore **cannot be combined
                    with `stream=true`**.


                    Response body for `srt`:


                    ```

                    1

                    00:00:00,100 --> 00:00:01,660

                    Hello everyone.


                    2

                    00:00:02,000 --> 00:00:06,100

                    Let me check the question.

                    ```


                    Response body for `vtt`:


                    ```

                    WEBVTT


                    00:00:00.100 --> 00:00:01.660

                    Hello everyone.


                    00:00:02.000 --> 00:00:06.100

                    Let me check the question.

                    ```
                  enum:
                    - json
                    - verbose_json
                    - srt
                    - vtt
                  default: json
                  example: json
                timestamp_level:
                  type: string
                  description: >-
                    The timestamp granularity. This parameter only takes effect
                    when `response_format` is `verbose_json`, `srt`, or `vtt`,
                    because these formats enable speaker diarization and forced
                    alignment.


                    - Empty or `sentence` (default): preserves the original
                    sentence/segment timestamps and merges adjacent text from
                    the same speaker within the same segment.

                    - `word`: returns character-level timestamps for Chinese and
                    word-level timestamps for English. Each unit still includes
                    `speaker`.


                    When `response_format=json`, including when `stream=true`,
                    this parameter is accepted but ignored.
                  enum:
                    - ''
                    - sentence
                    - word
                  default: ''
                  example: word
                stream:
                  type: boolean
                  description: >-
                    Whether to stream the transcription result.


                    - `false` (default): the full result is returned once
                    transcription completes.

                    - `true`: incremental text is pushed over SSE and the
                    response type is `text/event-stream`. In this case
                    `response_format` only supports `json`.


                    A streaming response is pushed line by line as `data:
                    <json>`, with events separated by blank lines:


                    ```

                    data: {"index":0,"delta":"Hello","finish":false}


                    data: {"index":1,"delta":" everyone","finish":false}


                    data: {"index":2,"delta":"","finish":true,"duration":26.325}

                    ```


                    The `data` field of each event is a JSON object: `index` is
                    the event sequence number starting from `0`, `delta` is the
                    newly transcribed text for this event, `finish` indicates
                    whether this is the terminating event, and `duration` is the
                    audio duration in seconds (returned only in the terminating
                    event). Clients should concatenate all `delta` values in
                    `index` order and stop reading after receiving
                    `finish=true`.
                  default: false
                  example: false
      responses:
        '200':
          description: >-
            Transcription succeeded. The fields below apply when
            `response_format` is `json` or `verbose_json`. For the response body
            of `srt` / `vtt` or `stream=true`, see the description of the
            corresponding request parameter.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AsrResp'
              examples:
                json:
                  summary: response_format=json
                  value:
                    text: >-
                      The merchant actually made money, because their cold chain
                      shipping is expensive.
                    duration: 26.325
                    trace_id: 021785229015510a2c883cf675b9804d
                verbose_json:
                  summary: response_format=verbose_json
                  value:
                    text: Hello everyone. Let me check the question.
                    duration: 12.744
                    n_speakers: 2
                    segments:
                      - id: 0
                        start: 0.1
                        end: 1.66
                        speaker: S1
                        text: Hello everyone.
                      - id: 1
                        start: 2
                        end: 6.1
                        speaker: S2
                        text: Let me check the question.
                    trace_id: 021785229015510a2c883cf675b9804d
        '400':
          $ref: '#/components/responses/Err400'
        '401':
          $ref: '#/components/responses/Err401'
        '402':
          $ref: '#/components/responses/Err402'
        '413':
          $ref: '#/components/responses/Err413'
        '422':
          $ref: '#/components/responses/Err422'
        '429':
          $ref: '#/components/responses/Err429'
        '500':
          $ref: '#/components/responses/Err500'
components:
  schemas:
    AsrResp:
      type: object
      properties:
        text:
          type: string
          description: >-
            The full transcribed text. Under `verbose_json` this equals the
            concatenation of all `segments[].text` in time order.
        duration:
          type: number
          description: >-
            The duration of the input audio, in seconds. Billing is based on
            this duration.
        n_speakers:
          type: integer
          description: >-
            The number of detected speakers. **Returned only when
            `response_format=verbose_json`.**
        segments:
          type: array
          description: >-
            Timestamped transcription units, each carrying start/end times and a
            speaker identifier. Their granularity is controlled by
            `timestamp_level`: sentence/segment level by default, or
            character/word level when set to `word`. **Returned only when
            `response_format=verbose_json`.**
          items:
            $ref: '#/components/schemas/AsrSegment'
        trace_id:
          type: string
          description: The trace ID of this request, useful for troubleshooting.
    AsrSegment:
      type: object
      properties:
        id:
          type: integer
          description: The index of this timestamped unit in the result, starting from `0`.
        start:
          type: number
          description: The start time of this unit, in seconds.
        end:
          type: number
          description: The end time of this unit, in seconds.
        speaker:
          type: string
          description: >-
            The speaker identifier, such as `S1` or `S2`. The same identifier
            denotes the same speaker.
        text:
          type: string
          description: The transcribed text of this sentence/segment, character, or word.
    OaiError:
      type: object
      description: >-
        OpenAI-style error response. On failure the HTTP status code is the real
        error code (401/400/429/402/413/422/500 and so on) and the response body
        follows this structure.
      properties:
        type:
          type: string
          description: Always `error`.
          example: error
        error:
          $ref: '#/components/schemas/OaiErrorDetail'
        request_id:
          type: string
          description: The request trace ID, useful for troubleshooting.
    OaiErrorDetail:
      type: object
      properties:
        type:
          type: string
          description: >-
            The error type: `authorized_error`(401) / `bad_request_error`(400) /
            `rate_limit_error`(429) / `insufficient_balance_error`(402) /
            `unprocessable_entity_error`(422) / `invalid_request_error`(413) /
            `server_error`(500) and so on.
        message:
          type: string
          description: >-
            The error detail. The value in parentheses at the end is the
            internal error code (for example `... (1004)`).
        http_code:
          type: string
          description: The HTTP status code as a string, for example `401`.
  responses:
    Err400:
      description: Invalid parameters
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/OaiError'
          example:
            type: error
            error:
              type: bad_request_error
              message: >-
                invalid params, audio duration 623.4s exceeds the limit of 500s
                (2013)
              http_code: '400'
            request_id: 021785229015510a2c883cf675b9804d
    Err401:
      description: Authentication failed
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/OaiError'
          example:
            type: error
            error:
              type: authorized_error
              message: >-
                login fail: Please carry the API secret key in the
                'Authorization' field of the request header (1004)
              http_code: '401'
            request_id: 021785229015510a2c883cf675b9804d
    Err402:
      description: Insufficient balance or quota
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/OaiError'
          example:
            type: error
            error:
              type: insufficient_balance_error
              message: insufficient balance (1008)
              http_code: '402'
            request_id: 021785229015510a2c883cf675b9804d
    Err413:
      description: Request body exceeds the size limit
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/OaiError'
          example:
            type: error
            error:
              type: invalid_request_error
              message: >-
                request body too large: 88200078 bytes exceeds limit of 52428800
                bytes
              http_code: '413'
            request_id: 021785229015510a2c883cf675b9804d
    Err422:
      description: Input contains sensitive content
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/OaiError'
          example:
            type: error
            error:
              type: unprocessable_entity_error
              message: audio content contains sensitive content (1026)
              http_code: '422'
            request_id: 021785229015510a2c883cf675b9804d
    Err429:
      description: Rate limit exceeded
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/OaiError'
          example:
            type: error
            error:
              type: rate_limit_error
              message: rate limit, please retry later (1002)
              http_code: '429'
            request_id: 021785229015510a2c883cf675b9804d
    Err500:
      description: Server error
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/OaiError'
          example:
            type: error
            error:
              type: server_error
              message: internal error (1000)
              http_code: '500'
            request_id: 021785229015510a2c883cf675b9804d
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: |-
        `HTTP: Bearer Auth`
         - Security Scheme Type: http
         - HTTP Authorization Scheme: Bearer API_key, used to verify account information. You can view it in [Account Management > API Key](https://platform.minimax.io/user-center/basic-information/interface-key).

````