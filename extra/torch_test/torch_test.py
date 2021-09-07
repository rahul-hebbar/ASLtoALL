import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3' 
os.environ["CUDA_VISIBLE_DEVICES"]="-1"

from utils import *
import tensorflow as tf

model = tf.saved_model.load('en_v2_tf')
print(list(model.signatures.keys()))
# batches = split_into_batches(['orig.wav'], batch_size=10)
# inp = prepare_model_input(read_batch(batches[0]))
# prep = tf.constant(inp.numpy())
# prep_r = tf.reshape(prep,[-1,1])
# print(prep_r)
# res = model.signatures["serving_default"](prep)
# print(res)
