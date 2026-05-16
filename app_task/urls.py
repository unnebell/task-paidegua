from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('entrar/', views.login_view, name='login'),
    path('sair/', views.logout_view, name='logout'),
    path('registro/', views.register_view, name='registro'),

    # API de tarefas
    path('api/tarefas/',          views.get_tarefas,    name='get_tarefas'),
    path('api/tarefas/criar/',    views.criar_tarefa,   name='criar_tarefa'),
    path('api/tarefas/<int:pk>/editar/',  views.editar_tarefa,  name='editar_tarefa'),
    path('api/tarefas/<int:pk>/concluir/', views.concluir_tarefa, name='concluir_tarefa'),
    path('api/tarefas/<int:pk>/deletar/', views.deletar_tarefa, name='deletar_tarefa'),
]