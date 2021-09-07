from flask import Flask
from flask_socketio import SocketIO,emit
import array
import torch
from itertools import groupby
import logging

logging.getLogger('socketio').setLevel(logging.ERROR)
logging.getLogger('engineio').setLevel(logging.ERROR)
logging.getLogger('werkzeug').setLevel(logging.ERROR)

app = Flask(__name__)
socketio = SocketIO(app, logger=False , engineio_logger=False)
socketio.init_app(app, cors_allowed_origins="*")

@socketio.on('connect')
def connect_e():
    print('Client requested');

@socketio.on('audio_stt')
def stt(json):
    arr_list = array.array('f',json["data"]).tolist()
    torch_arr = torch.tensor(arr_list,dtype=torch.float32)
    torch_inp = torch.unsqueeze(torch_arr,0)
    torch_out = model(torch_inp)
    text_out = decoder(torch.squeeze(torch_out,0).cpu())
    print(text_out)
    emit('stt_text', { 'text': text_out })

@socketio.on('disconnect')
def test_disconnect():
    print('Client disconnected')

class Decoder():
    def __init__(self,labels):
        self.labels = labels
        self.blank_idx = self.labels.index('_')
        self.space_idx = self.labels.index(' ')

    def process(self,
                probs, wav_len, word_align):
        assert len(self.labels) == probs.shape[1]
        for_string = []
        argm = torch.argmax(probs, axis=1)
        align_list = [[]]
        for j, i in enumerate(argm):
            if i == self.labels.index('2'):
                try:
                    prev = for_string[-1]
                    for_string.append('$')
                    for_string.append(prev)
                    align_list[-1].append(j)
                    continue
                except:
                    for_string.append(' ')
                    align_list.append([])
                    continue
            if i != self.blank_idx:
                for_string.append(self.labels[i])
                if i == self.space_idx:
                    align_list.append([])
                else:
                    align_list[-1].append(j)

        string = ''.join([x[0] for x in groupby(for_string)]).replace('$', '').strip()

        align_list = list(filter(lambda x: x, align_list))

        if align_list and wav_len and word_align:
            align_dicts = []
            linear_align_coeff = wav_len / len(argm)
            to_move = min(align_list[0][0], 1.5)
            for i, align_word in enumerate(align_list):
                if len(align_word) == 1:
                    align_word.append(align_word[0])
                align_word[0] = align_word[0] - to_move
                if i == (len(align_list) - 1):
                    to_move = min(1.5, len(argm) - i)
                    align_word[-1] = align_word[-1] + to_move
                else:
                    to_move = min(1.5, (align_list[i+1][0] - align_word[-1]) / 2)
                    align_word[-1] = align_word[-1] + to_move

            for word, timing in zip(string.split(), align_list):
                align_dicts.append({'word': word,
                                    'start_ts': round(timing[0] * linear_align_coeff, 2),
                                    'end_ts': round(timing[-1] * linear_align_coeff, 2)})

            return string, align_dicts
        return string

    def __call__(self,
                 probs: torch.Tensor,
                 wav_len: float = 0,
                 word_align: bool = False):
        return self.process(probs, wav_len, word_align)

if __name__ == "__main__":
    torch.device('cpu')
    model = torch.jit.load('./model/en_v3_jit_q_xsmall.model')
    print('model loaded')
    model.eval()
    decoder = Decoder(model.labels)
    print('decoder initiated')
    socketio.run(app, host='0.0.0.0', log_output=False)