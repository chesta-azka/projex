'use client';

import { useToast } from '@/components/ui/use-toast';
import { projects } from '@/utils/projects';
import { useMemo, useState, useCallback } from 'react';
import { CloseProjectDialog } from './components/CloseProjectDialog';
import { ProjectTabs } from './components/ProjectTabs';
import { DeleteProjectDialog } from './components/DeleteProjectDialog';
import { ReopenProjectDialog } from './components/ReopenProjectDialog';

interface ProjectsProps {
  initialProjects: IProject[];
}

export const Projects = ({ initialProjects }: ProjectsProps) => {
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [projectsList, setProjectsList] = useState<IProject[]>(initialProjects);

  const [projectToClose, setProjectToClose] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<IProject | null>(null);
  const [projectToReopen, setProjectToReopen] = useState<string | null>(null);

  const filteredProjects = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    const filtered = projectsList.filter((p) =>
      `${p.name} ${p.description}`.toLowerCase().includes(lowerSearch)
    );

    return filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [projectsList, searchTerm, sortOrder]);

  const activeProjects = useMemo(() => filteredProjects.filter((p) => !p.closed), [filteredProjects]);
  const closedProjects = useMemo(() => filteredProjects.filter((p) => p.closed), [filteredProjects]);

  const handleSort = useCallback((order: 'newest' | 'oldest') => {
    setSortOrder(order);
  }, []);

  const updateProjectState = useCallback((id: string, changes: Partial<IProject>) => {
    setProjectsList((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)));
  }, []);

const handleCloseProject = useCallback(async () => {
  if (!projectToClose) return;

  try {
    await projects.management.close(projectToClose);
    updateProjectState(projectToClose, { closed: true });
    toast({ title: 'Success', description: 'Project closed successfully' });
  } catch (error) {
    console.error('Error closing project:', error);
    toast({
      variant: 'destructive',
      title: 'Error',
      description: error?.message || 'Failed to close project. Please try again.',
    });
  } finally {
    setProjectToClose(null);
  }
}, [projectToClose, updateProjectState, toast]);


  const handleReopenProject = useCallback(async () => {
    if (!projectToReopen) return;

    try {
      await projects.management.reopen(projectToReopen);
      updateProjectState(projectToReopen, { closed: false });
      toast({ title: 'Success', description: 'Project reopened successfully' });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reopen project. Please try again.',
      });
    } finally {
      setProjectToReopen(null);
    }
  }, [projectToReopen, updateProjectState, toast]);

  const handleDeleteProject = useCallback(async () => {
    if (!projectToDelete) return;

    try {
      await projects.management.delete(projectToDelete.id);
      setProjectsList((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      toast({ title: 'Success', description: 'Project deleted successfully' });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete project.',
      });
    } finally {
      setProjectToDelete(null);
    }
  }, [projectToDelete, toast]);

  return (
    <div className="space-y-4">
      <ProjectTabs
        activeProjects={activeProjects}
        closedProjects={closedProjects}
        allProjects={filteredProjects}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        sortOrder={sortOrder}
        onSort={handleSort}
        setProjectToClose={setProjectToClose}
        setProjectToReopen={setProjectToReopen}
        setProjectToDelete={setProjectToDelete}
      />

      <CloseProjectDialog
        open={Boolean(projectToClose)}
        onOpenChange={(open) => !open && setProjectToClose(null)}
        onConfirm={handleCloseProject}
      />

      <DeleteProjectDialog
        open={Boolean(projectToDelete)}
        onOpenChange={(open) => !open && setProjectToDelete(null)}
        onConfirm={handleDeleteProject}
        projectName={projectToDelete?.name ?? ''}
      />

      <ReopenProjectDialog
        open={Boolean(projectToReopen)}
        onOpenChange={(open) => !open && setProjectToReopen(null)}
        onConfirm={handleReopenProject}
      />
    </div>
  );
};
