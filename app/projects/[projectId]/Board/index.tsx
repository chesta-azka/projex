'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, DragOverlay, closestCorners } from '@dnd-kit/core';
import { Eye, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { CreateCustomFieldOptionModal } from '@/components/CreateCustomFieldOptionModal';
import { TaskDetailsProvider } from './TaskDetailsContext';
import { TaskDetailsDrawer } from './TaskDetailsDrawer';
import { TaskItem } from './TaskItem';
import { ColumnContainer } from './ColumnContainer';

import { useProjectAccess } from '@/hooks/useProjectAccess';
import { useProjectQueries } from '@/hooks/useProjectQueries';
import { cn } from '@/lib/utils';
import { columns as columnsUtils } from '@/utils/columns';
import { getColumnSortedTasks, sortTasks } from '@/utils/sort';
import { useBoardDragAndDrop } from './useBoardDragAndDrop';
import { secondaryBtnStyles } from '@/app/commonStyles';

interface Props {
  projectId: string;
  projectName: string;
  statuses: IStatus[];
}

export const Board: React.FC<Props> = ({ projectId, projectName, statuses }) => {
  const { can } = useProjectAccess({ projectId });
  const { projectTasks, reloadProjectTasks } = useProjectQueries(projectId);

  const [columns, setColumns] = useState<IStatus[]>(statuses);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [tasks, setTasks] = useState<ITaskWithOptions[]>(projectTasks || []);
  const [isLoading, setIsLoading] = useState(false);

  const {
    activeTask,
    sensors,
    overColumnId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
  } = useBoardDragAndDrop();

  // Sync tasks when projectTasks update
  useEffect(() => {
    setTasks(projectTasks || []);
  }, [projectTasks]);

  const sortedTasks = sortTasks(tasks);

  const getColumnTasks = useCallback(
    (statusId: string) => getColumnSortedTasks(sortedTasks, statusId),
    [sortedTasks]
  );

  // Handlers
  const handleTaskCreated = useCallback(
    (newTask: ITaskWithOptions) => {
      setTasks((prev) => [...prev, newTask]);
    },
    []
  );

  const handleColumnUpdate = useCallback(
    (updatedColumn: IStatus) => {
      setColumns((prev) =>
        prev.map((col) => (col.id === updatedColumn.id ? updatedColumn : col))
      );
    },
    []
  );

  const handleColumnDelete = useCallback(
    (columnId: string) => {
      setColumns((prev) => prev.filter((col) => col.id !== columnId));
    },
    []
  );

  const handleColumnHide = useCallback(
    (columnId: string) => {
      setHiddenColumns((prev) => new Set(prev).add(columnId));
    },
    []
  );

  const handleShowHiddenColumns = useCallback(() => {
    setHiddenColumns(new Set());
  }, []);

  const handleCreateColumn = useCallback(
    async (data: Omit<ICustomFieldData, 'id'>) => {
      setIsLoading(true);
      try {
        const newColumn = await columnsUtils.createColumn(projectId, data);
        setColumns((prev) => [...prev, newColumn]);
        toast({
          title: 'Success',
          description: 'Column created successfully',
          variant: 'default',
        });
      } catch (error) {
        console.error('Error creating column:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to create column',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [projectId]
  );

  const handleTaskUpdate = useCallback(
    async (taskId: string, updates: Partial<ITaskWithOptions>) => {
      try {
        if ('labels' in updates || 'size' in updates || 'priority' in updates) {
          await reloadProjectTasks();
        } else {
          setTasks((prev) =>
            prev.map((task) =>
              task.id === taskId ? { ...task, ...updates } : task
            )
          );
        }
      } catch (error) {
        console.error('Error updating task:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to update task',
        });
      }
    },
    [reloadProjectTasks]
  );

  const visibleColumns = columns.filter((col) => !hiddenColumns.has(col.id));

  // Components
  const HiddenColumnsNotice = () =>
    hiddenColumns.size > 0 ? (
      <div className="py-1">
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs gap-1.5"
          onClick={handleShowHiddenColumns}
        >
          <Eye className="w-3 h-3" />
          Show hidden columns ({hiddenColumns.size})
        </Button>
      </div>
    ) : null;

  return (
    <TaskDetailsProvider onTaskUpdate={handleTaskUpdate}>
      <div className="h-[calc(100vh-200px)] flex flex-col">
        <HiddenColumnsNotice />

        <div className="flex gap-1 w-full overflow-x-auto py-1">
          <div
            className={cn(
              'flex gap-3',
              hiddenColumns.size > 0
                ? 'h-[calc(100vh-175px)]'
                : 'h-[calc(100vh-155px)]'
            )}
          >
            <DndContext
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={(event) => handleDragEnd(event, sortedTasks, setTasks)}
              collisionDetection={closestCorners}
              sensors={sensors}
            >
              {visibleColumns.map((column) => (
                <ColumnContainer
                  key={column.id}
                  projectId={projectId}
                  projectName={projectName}
                  column={column}
                  can={can}
                  tasks={getColumnTasks(column.id)}
                  onTaskCreated={handleTaskCreated}
                  onColumnUpdate={handleColumnUpdate}
                  onColumnDelete={handleColumnDelete}
                  onColumnHide={handleColumnHide}
                  isOver={overColumnId === column.id}
                />
              ))}

              {typeof document !== 'undefined' &&
                createPortal(
                  <DragOverlay>
                    {activeTask && (
                      <TaskItem item={activeTask} projectName={projectName} index={0} />
                    )}
                  </DragOverlay>,
                  document.body
                )}
            </DndContext>
          </div>

          <CreateCustomFieldOptionModal
            title="New Column"
            handleSubmit={handleCreateColumn}
            triggerBtn={
              <Button
                className={cn(secondaryBtnStyles, 'w-8 h-8 p-2 mr-4')}
                disabled={isLoading}
              >
                <Plus />
              </Button>
            }
          />

          <TaskDetailsDrawer />
        </div>
      </div>
    </TaskDetailsProvider>
  );
};
