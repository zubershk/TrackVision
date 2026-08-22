import onnx
from onnx import helper, TensorProto, numpy_helper
import numpy as np
import os

# Create models directory
os.makedirs('public/models', exist_ok=True)

def create_yolov8n_model():
    """Create minimal YOLOv8n ONNX model for COCO 80-class detection"""
    input_tensor = helper.make_tensor_value_info('images', TensorProto.FLOAT, [1, 3, 640, 640])
    output_tensor = helper.make_tensor_value_info('output0', TensorProto.FLOAT, [1, 84, 8400])
    
    weight_shape = [32, 3, 3, 3]
    weight_vals = np.random.randn(*weight_shape).astype(np.float32) * 0.01
    weight_tensor = numpy_helper.from_array(weight_vals, name='conv_weight')
    
    bias_vals = np.zeros(32, dtype=np.float32)
    bias_tensor = numpy_helper.from_array(bias_vals, name='conv_bias')
    
    conv_node = helper.make_node(
        'Conv',
        inputs=['images', 'conv_weight', 'conv_bias'],
        outputs=['conv_out'],
        kernel_shape=[3, 3],
        pads=[1, 1, 1, 1],
        strides=[1, 1]
    )
    
    gap_node = helper.make_node(
        'GlobalAveragePool',
        inputs=['conv_out'],
        outputs=['gap_out']
    )
    
    reshape_node = helper.make_node(
        'Reshape',
        inputs=['gap_out', 'shape_tensor'],
        outputs=['output0']
    )
    
    shape_vals = np.array([1, 84, 8400], dtype=np.int64)
    shape_tensor = numpy_helper.from_array(shape_vals, name='shape_tensor')
    
    graph = helper.make_graph(
        nodes=[conv_node, gap_node, reshape_node],
        name='yolov8n',
        inputs=[input_tensor],
        outputs=[output_tensor],
        initializer=[weight_tensor, bias_tensor, shape_tensor]
    )
    
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid('', 13)])
    onnx.save(model, 'public/models/yolov8n.onnx')
    print("Created yolov8n.onnx")

def create_yoloworld_model():
    input_tensor = helper.make_tensor_value_info('images', TensorProto.FLOAT, [1, 3, 640, 640])
    output_tensor = helper.make_tensor_value_info('output0', TensorProto.FLOAT, [1, 84, 8400])
    
    weight_shape = [32, 3, 3, 3]
    weight_vals = np.random.randn(*weight_shape).astype(np.float32) * 0.01
    weight_tensor = numpy_helper.from_array(weight_vals, name='conv_weight')
    
    bias_vals = np.zeros(32, dtype=np.float32)
    bias_tensor = numpy_helper.from_array(bias_vals, name='conv_bias')
    
    conv_node = helper.make_node(
        'Conv',
        inputs=['images', 'conv_weight', 'conv_bias'],
        outputs=['conv_out'],
        kernel_shape=[3, 3],
        pads=[1, 1, 1, 1],
        strides=[1, 1]
    )
    
    gap_node = helper.make_node(
        'GlobalAveragePool',
        inputs=['conv_out'],
        outputs=['gap_out']
    )
    
    reshape_node = helper.make_node(
        'Reshape',
        inputs=['gap_out', 'shape_tensor'],
        outputs=['output0']
    )
    
    shape_vals = np.array([1, 84, 8400], dtype=np.int64)
    shape_tensor = numpy_helper.from_array(shape_vals, name='shape_tensor')
    
    graph = helper.make_graph(
        nodes=[conv_node, gap_node, reshape_node],
        name='yoloworld',
        inputs=[input_tensor],
        outputs=[output_tensor],
        initializer=[weight_tensor, bias_tensor, shape_tensor]
    )
    
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid('', 13)])
    onnx.save(model, 'public/models/yoloworld.onnx')
    print("Created yoloworld.onnx")

def create_osnet_model():
    input_tensor = helper.make_tensor_value_info('input', TensorProto.FLOAT, [1, 3, 256, 128])
    output_tensor = helper.make_tensor_value_info('output', TensorProto.FLOAT, [1, 512])
    
    weight_shape = [64, 3, 3, 3]
    weight_vals = np.random.randn(*weight_shape).astype(np.float32) * 0.01
    weight_tensor = numpy_helper.from_array(weight_vals, name='conv_weight')
    
    bias_vals = np.zeros(64, dtype=np.float32)
    bias_tensor = numpy_helper.from_array(bias_vals, name='conv_bias')
    
    conv_node = helper.make_node(
        'Conv',
        inputs=['input', 'conv_weight', 'conv_bias'],
        outputs=['conv_out'],
        kernel_shape=[3, 3],
        pads=[1, 1, 1, 1],
        strides=[1, 1]
    )
    
    gap_node = helper.make_node(
        'GlobalAveragePool',
        inputs=['conv_out'],
        outputs=['gap_out']
    )
    
    fc_weight_shape = [512, 64]
    fc_weight_vals = np.random.randn(*fc_weight_shape).astype(np.float32) * 0.01
    fc_weight_tensor = numpy_helper.from_array(fc_weight_vals, name='fc_weight')
    
    fc_bias_vals = np.zeros(512, dtype=np.float32)
    fc_bias_tensor = numpy_helper.from_array(fc_bias_vals, name='fc_bias')
    
    flatten_node = helper.make_node(
        'Flatten',
        inputs=['gap_out'],
        outputs=['flat_out'],
        axis=1
    )
    
    matmul_node = helper.make_node(
        'MatMul',
        inputs=['flat_out', 'fc_weight'],
        outputs=['matmul_out']
    )
    
    add_node = helper.make_node(
        'Add',
        inputs=['matmul_out', 'fc_bias'],
        outputs=['output']
    )
    
    graph = helper.make_graph(
        nodes=[conv_node, gap_node, flatten_node, matmul_node, add_node],
        name='osnet',
        inputs=[input_tensor],
        outputs=[output_tensor],
        initializer=[weight_tensor, bias_tensor, fc_weight_tensor, fc_bias_tensor]
    )
    
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid('', 13)])
    onnx.save(model, 'public/models/osnet_x1_0.onnx')
    print("Created osnet_x1_0.onnx")

def create_clip_text_encoder():
    input_tensor = helper.make_tensor_value_info('input_ids', TensorProto.INT64, [1, 77])
    output_tensor = helper.make_tensor_value_info('text_embeds', TensorProto.FLOAT, [1, 512])
    
    vocab_size = 49408
    embed_dim = 512
    
    embed_weight_vals = np.random.randn(vocab_size, embed_dim).astype(np.float32) * 0.02
    embed_weight_tensor = numpy_helper.from_array(embed_weight_vals, name='token_embedding')
    
    pos_embed_vals = np.random.randn(77, 512).astype(np.float32) * 0.01
    pos_embed_tensor = numpy_helper.from_array(pos_embed_vals, name='positional_embedding')
    
    gather_node = helper.make_node(
        'Gather',
        inputs=['token_embedding', 'input_ids'],
        outputs=['token_embeds'],
        axis=0
    )
    
    add_pos_node = helper.make_node(
        'Add',
        inputs=['token_embeds', 'positional_embedding'],
        outputs=['pos_embeds']
    )
    
    ln_weight = numpy_helper.from_array(np.ones(512, dtype=np.float32), name='ln_weight')
    ln_bias = numpy_helper.from_array(np.zeros(512, dtype=np.float32), name='ln_bias')
    ln_node = helper.make_node(
        'LayerNormalization',
        inputs=['pos_embeds', 'ln_weight', 'ln_bias'],
        outputs=['ln_out'],
        axis=-1
    )
    
    reduce_mean_node = helper.make_node(
        'ReduceMean',
        inputs=['ln_out'],
        outputs=['output'],
        axes=[1],
        keepdims=0
    )
    
    graph = helper.make_graph(
        nodes=[gather_node, add_pos_node, ln_node, reduce_mean_node],
        name='clip_text_encoder',
        inputs=[input_tensor],
        outputs=[output_tensor],
        initializer=[embed_weight_tensor, pos_embed_tensor, ln_weight, ln_bias]
    )
    
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid('', 13)])
    onnx.save(model, 'public/models/clip_text_encoder.onnx')
    print("Created clip_text_encoder.onnx")

if __name__ == '__main__':
    print("Creating minimal ONNX models...")
    create_yolov8n_model()
    create_yoloworld_model()
    create_osnet_model()
    create_clip_text_encoder()
    print("\nAll models created successfully!")