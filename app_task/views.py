import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render, redirect
from .models import ListaTarefas, Usuario


def get_usuario_id(request):
    return request.session.get('usuario_id')


def require_login(view_func):
    def wrapper(request, *args, **kwargs):
        if not get_usuario_id(request):
            return redirect('login')
        return view_func(request, *args, **kwargs)
    wrapper.__name__ = view_func.__name__
    return wrapper


def require_login_json(view_func):
    def wrapper(request, *args, **kwargs):
        if not get_usuario_id(request):
            return JsonResponse({'erro': 'Não autorizado'}, status=401)
        return view_func(request, *args, **kwargs)
    wrapper.__name__ = view_func.__name__
    return wrapper


def home(request):
    usuario_id = get_usuario_id(request)
    if not usuario_id:
        return redirect('login')
    try:
        usuario = Usuario.objects.get(pk=usuario_id)
    except Usuario.DoesNotExist:
        return redirect('login')
    return render(request, 'app_task/home.html', {'usuario_nome': usuario.nome})


def login_view(request):
    context = {}
    if request.method == 'POST':
        email = request.POST.get('email', '').strip()
        senha = request.POST.get('senha', '')
        try:
            usuario = Usuario.objects.get(email=email)
        except Usuario.DoesNotExist:
            context['erro'] = 'E-mail ou senha incorretos.'
        else:
            if usuario.senha != senha:
                context['erro'] = 'E-mail ou senha incorretos.'
            else:
                request.session['usuario_id'] = usuario.id
                return redirect('home')
    return render(request, 'app_task/login.html', context)


def register_view(request):
    context = {}
    if request.method == 'POST':
        nome = request.POST.get('nome', '').strip()
        email = request.POST.get('email', '').strip()
        senha = request.POST.get('senha', '')
        confirmar_senha = request.POST.get('confirmar_senha', '')

        if not nome or not email or not senha:
            context['erro'] = 'Preencha todos os campos.'
        elif senha != confirmar_senha:
            context['erro'] = 'As senhas não coincidem.'
        elif Usuario.objects.filter(email=email).exists():
            context['erro'] = 'Já existe uma conta com este e-mail.'
        else:
            usuario = Usuario.objects.create(nome=nome, email=email, senha=senha)
            request.session['usuario_id'] = usuario.id
            return redirect('home')

    return render(request, 'app_task/register.html', context)


def logout_view(request):
    request.session.flush()
    return redirect('login')


def get_tarefas(request):
    usuario_id = get_usuario_id(request)
    if not usuario_id:
        return JsonResponse({'erro': 'Não autorizado'}, status=401)
    tarefas = ListaTarefas.objects.filter(usuario_id=usuario_id).values(
        'id', 'titulo', 'descricao', 'data', 'status'
    )
    lista = []
    for t in tarefas:
        lista.append({
            'id': t['id'],
            'titulo': t['titulo'],
            'descricao': t['descricao'] or '',
            'data': str(t['data']),   # "YYYY-MM-DD"
            'status': t['status'],
        })
    return JsonResponse(lista, safe=False)

@csrf_exempt
@require_login_json
def criar_tarefa(request):
    if request.method != 'POST':
        return JsonResponse({'erro': 'Método não permitido'}, status=405)
    dados = json.loads(request.body)
    usuario_id = get_usuario_id(request)
    tarefa = ListaTarefas.objects.create(
        usuario_id=usuario_id,
        titulo=dados['titulo'],
        descricao=dados.get('descricao', ''),
        data=dados['data'],
        status=dados.get('status', 'Pendente'),
    )
    return JsonResponse({'id': tarefa.id}, status=201)

@csrf_exempt
@require_login_json
def editar_tarefa(request, pk):
    if request.method != 'PUT':
        return JsonResponse({'erro': 'Método não permitido'}, status=405)
    dados = json.loads(request.body)
    usuario_id = get_usuario_id(request)
    try:
        tarefa = ListaTarefas.objects.get(pk=pk, usuario_id=usuario_id)
    except ListaTarefas.DoesNotExist:
        return JsonResponse({'erro': 'Não encontrada'}, status=404)
    tarefa.titulo    = dados.get('titulo',    tarefa.titulo)
    tarefa.descricao = dados.get('descricao', tarefa.descricao)
    tarefa.data      = dados.get('data',      tarefa.data)
    tarefa.status    = dados.get('status',    tarefa.status)
    tarefa.save()
    return JsonResponse({'ok': True})

@csrf_exempt
@require_login_json
def concluir_tarefa(request, pk):
    if request.method not in ('POST', 'PUT', 'PATCH'):
        return JsonResponse({'erro': 'Método não permitido'}, status=405)
    usuario_id = get_usuario_id(request)
    try:
        tarefa = ListaTarefas.objects.get(pk=pk, usuario_id=usuario_id)
    except ListaTarefas.DoesNotExist:
        return JsonResponse({'erro': 'Não encontrada'}, status=404)
    tarefa.status = 'Concluído'
    tarefa.save()
    return JsonResponse({'ok': True})

@csrf_exempt
@require_login_json
def deletar_tarefa(request, pk):
    if request.method != 'DELETE':
        return JsonResponse({'erro': 'Método não permitido'}, status=405)
    try:
        usuario_id = get_usuario_id(request)
        tarefa = ListaTarefas.objects.get(pk=pk, usuario_id=usuario_id)
    except ListaTarefas.DoesNotExist:
        return JsonResponse({'erro': 'Não encontrada'}, status=404)
    tarefa.delete()
    return JsonResponse({'ok': True})