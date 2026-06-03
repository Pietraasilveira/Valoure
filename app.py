from flask import Flask, request, jsonify, session, send_from_directory, render_template
import sqlite3
import os
from datetime import datetime
from werkzeug.utils import secure_filename

app = Flask(
    __name__,
    static_folder='static',
    template_folder='templates'
)

UPLOAD_FOLDER = os.path.join(app.static_folder, 'img', 'produtos')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

app.secret_key = 'valoure_secret_key'

# ===============================
# CAMINHO DATABASE
# ===============================

DB_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    'valoure.db'
)

# ===============================
# CONEXÃO DATABASE
# ===============================

def get_db():

    conn = sqlite3.connect(DB_PATH)

    conn.row_factory = sqlite3.Row

    return conn

# ===============================
# ROTA PRINCIPAL
# ===============================

@app.route('/')
def index():

    return render_template('index.html')

# ===============================
# LOGIN
# ===============================

@app.route('/login', methods=['POST'])
def login():

    data = request.get_json()

    email = data.get('email')
    senha = data.get('senha')

    # LOGIN ADMIN
    if (
        email == 'admin@valoure.com'
        and
        senha == 'valoure123'
    ):

        session['user'] = 'Administrador'

        return jsonify({
            'status': 'success'
        })

    conn = get_db()

    user = conn.execute(
        '''
        SELECT *
        FROM usuario
        WHERE email = ?
        AND senha = ?
        ''',
        (email, senha)
    ).fetchone()

    conn.close()

    if user:

        session['user'] = user['nome']

        return jsonify({
            'status': 'success'
        })

    return jsonify({
        'status': 'error',
        'message': 'Credenciais inválidas'
    }), 401

# ===============================
# LOGOUT
# ===============================

@app.route('/logout')
def logout():

    session.clear()

    return jsonify({
        'status': 'success'
    })

# ===============================
# DASHBOARD
# ===============================

@app.route('/api/dashboard')
def dashboard_stats():
    conn = get_db()

    total_produtos = conn.execute('SELECT COUNT(*) FROM produtos').fetchone()[0]
    total_clientes = conn.execute('SELECT COUNT(*) FROM cliente').fetchone()[0]
    total_vendas = conn.execute('SELECT COUNT(*) FROM venda').fetchone()[0]

    # Categorias mais vendidas
    categorias_vendas = conn.execute('''
        SELECT p.categoria, COALESCE(SUM(v.quantidade), 0) as total
        FROM produtos p
        LEFT JOIN venda v ON v.id_produto = p.id_produto
        GROUP BY p.categoria
        HAVING total > 0
        ORDER BY total DESC
    ''').fetchall()

    # Últimas 5 vendas
    ultimas_vendas = conn.execute('''
        SELECT v.*, c.nome as cliente_nome, p.nome as produto_nome, p.categoria as produto_categoria
        FROM venda v
        JOIN cliente c ON v.id_cliente = c.id_cliente
        JOIN produtos p ON v.id_produto = p.id_produto
        ORDER BY v.id_venda DESC
        LIMIT 5
    ''').fetchall()

    conn.close()

    return jsonify({
        'total_produtos': total_produtos,
        'total_clientes': total_clientes,
        'total_vendas': total_vendas,
        'categorias_vendas': [dict(c) for c in categorias_vendas],
        'ultimas_vendas': [dict(v) for v in ultimas_vendas]
    })

# ===============================
# PRODUTOS
# ===============================

@app.route('/api/produtos', methods=['GET', 'POST'])
def handle_produtos():

    conn = get_db()

    # CADASTRAR
    if request.method == 'POST':
        # Suporte tanto para JSON quanto para Form Data (upload de arquivo)
        if request.is_json:
            data = request.get_json()
            imagem_nome = data.get('imagem')
        else:
            data = request.form
            imagem_nome = data.get('imagem') # fallback se não houver arquivo
            
            if 'imagem_arquivo' in request.files:
                file = request.files['imagem_arquivo']
                if file and file.filename != '' and allowed_file(file.filename):
                    filename = secure_filename(f"{datetime.now().timestamp()}_{file.filename}")
                    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                    imagem_nome = filename

        conn.execute(
            '''
            INSERT INTO produtos (
                nome, preco, estoque, marca, categoria, descricao, imagem
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ''',
            (
                data['nome'],
                data['preco'],
                data['estoque'],
                data['marca'],
                data['categoria'],
                data['descricao'],
                imagem_nome
            )
        )

        conn.commit()
        conn.close()

        return jsonify({
            'status': 'success'
        })

    # LISTAR
    produtos = conn.execute(
        '''
        SELECT *
        FROM produtos
        ORDER BY id_produto DESC
        '''
    ).fetchall()

    conn.close()

    return jsonify([
        dict(p) for p in produtos
    ])

# ===============================
# DELETAR PRODUTO
# ===============================

@app.route('/api/produtos/<int:id_produto>', methods=['DELETE'])
def deletar_produto(id_produto):

    conn = get_db()

    conn.execute(
        '''
        DELETE FROM produtos
        WHERE id_produto = ?
        ''',
        (id_produto,)
    )

    conn.commit()

    conn.close()

    return jsonify({
        'status': 'success'
    })

# ===============================
# EDITAR PRODUTO
# ===============================

@app.route('/api/produtos/<int:id_produto>', methods=['PUT'])
def editar_produto(id_produto):
    conn = get_db()
    
    if request.is_json:
        data = request.get_json()
        imagem_nome = data.get('imagem')
    else:
        data = request.form
        # Buscar imagem atual para não perder se não enviar nova
        produto_atual = conn.execute('SELECT imagem FROM produtos WHERE id_produto = ?', (id_produto,)).fetchone()
        imagem_nome = produto_atual['imagem'] if produto_atual else None
        
        if 'imagem_arquivo' in request.files:
            file = request.files['imagem_arquivo']
            if file and file.filename != '' and allowed_file(file.filename):
                filename = secure_filename(f"{datetime.now().timestamp()}_{file.filename}")
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                imagem_nome = filename

    conn.execute(
        '''
        UPDATE produtos
        SET
            nome = ?,
            preco = ?,
            estoque = ?,
            marca = ?,
            categoria = ?,
            descricao = ?,
            imagem = ?
        WHERE id_produto = ?
        ''',
        (
            data['nome'],
            data['preco'],
            data['estoque'],
            data['marca'],
            data['categoria'],
            data['descricao'],
            imagem_nome,
            id_produto
        )
    )

    conn.commit()
    conn.close()

    return jsonify({
        'status': 'success'
    })

# ===============================
# CLIENTES
# ===============================

@app.route('/api/clientes', methods=['GET', 'POST'])
def handle_clientes():
    conn = get_db()
    if request.method == 'POST':
        data = request.get_json()
        conn.execute('INSERT INTO cliente (nome, email, senha) VALUES (?, ?, ?)', (data['nome'], data['email'], data['senha']))
        conn.execute('INSERT INTO usuario (nome, email, senha) VALUES (?, ?, ?)', (data['nome'], data['email'], data['senha']))
        conn.commit()
        conn.close()
        return jsonify({'status': 'success'})

    clientes = conn.execute('SELECT * FROM cliente').fetchall()
    conn.close()
    return jsonify([dict(c) for c in clientes])

@app.route('/api/clientes/<int:id_cliente>', methods=['PUT', 'DELETE'])
def handle_cliente_id(id_cliente):
    conn = get_db()
    if request.method == 'DELETE':
        conn.execute('DELETE FROM cliente WHERE id_cliente = ?', (id_cliente,))
        conn.commit()
        conn.close()
        return jsonify({'status': 'success'})
    
    if request.method == 'PUT':
        data = request.get_json()
        conn.execute('UPDATE cliente SET nome = ?, email = ?, senha = ? WHERE id_cliente = ?',
                     (data['nome'], data['email'], data['senha'], id_cliente))
        conn.commit()
        conn.close()
        return jsonify({'status': 'success'})

# ===============================
# VENDAS
# ===============================

@app.route('/api/vendas', methods=['GET', 'POST'])
def handle_vendas():
    conn = get_db()
    if request.method == 'POST':
        try:
            data = request.get_json()
            id_produto = data['id_produto']
            quantidade = int(data['quantidade'])
            
            produto = conn.execute('SELECT estoque FROM produtos WHERE id_produto = ?', (id_produto,)).fetchone()
            if not produto:
                return jsonify({'status': 'error', 'message': 'Produto não encontrado'}), 404
                
            if produto['estoque'] < quantidade:
                return jsonify({'status': 'error', 'message': f'Estoque insuficiente. Disponível: {produto["estoque"]}'}), 400
                
            # Registrar a venda
            conn.execute('''
                INSERT INTO venda (data_venda, id_cliente, id_usuario, id_produto, quantidade, preco_final, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                data['id_cliente'],
                1,
                id_produto,
                quantidade,
                data['preco_final'],
                data.get('status', 'Concluído')
            ))
            
            # Atualizar estoque
            conn.execute('UPDATE produtos SET estoque = estoque - ? WHERE id_produto = ?', (quantidade, id_produto))
            
            conn.commit()
            return jsonify({'status': 'success'})
        except Exception as e:
            conn.rollback()
            return jsonify({'status': 'error', 'message': str(e)}), 500
        finally:
            conn.close()
        
    vendas = conn.execute('''
        SELECT v.*, c.nome as cliente_nome, p.nome as produto_nome, p.categoria as produto_categoria 
        FROM venda v 
        JOIN cliente c ON v.id_cliente = c.id_cliente 
        JOIN produtos p ON v.id_produto = p.id_produto 
        ORDER BY v.id_venda DESC
    ''').fetchall()
    conn.close()
    return jsonify([dict(v) for v in vendas])

# ===============================
# INICIAR SERVIDOR
# ===============================

if __name__ == '__main__':

    conn = get_db()

    # CRIAR ADMIN
    admin = conn.execute(
        '''
        SELECT *
        FROM usuario
        WHERE email = ?
        ''',
        ('admin@valoure.com',)
    ).fetchone()

    if not admin:

        conn.execute(
            '''
            INSERT INTO usuario (

                nome,
                email,
                senha

            )

            VALUES (?, ?, ?)
            ''',

            (

                'Administrador',
                'admin@valoure.com',
                'valoure123'

            )
        )

        conn.commit()

    # CRIAR COLUNA IMAGEM
    try:

        conn.execute(
            '''
            ALTER TABLE produtos
            ADD COLUMN imagem TEXT
            '''
        )

        conn.commit()

    except:
        pass

    conn.close()

    app.run(
        debug=True,
        port=5000
    )